import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { db } from "@acme/db/client";
import { processingStage } from "@acme/db/schema";
import { eq } from "@acme/db";

interface ColmapJobData {
  presentationId: string;
  stageId: string;
  inputFileKey: string;
}

interface ColmapResult {
  outputKey: string;
  outputSize: number;
  metadata: {
    colmapPoints: number;
    imageCount: number;
  };
}

// Redis connection
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Import Modal function
// Note: This requires Modal SDK to be installed: pip install modal
// And the Modal function to be deployed
async function callModalColmap(jobData: ColmapJobData): Promise<ColmapResult> {
  // Use Modal's SDK to call the deployed function
  // Example: const modal = await import('modal');
  // const f = modal.Function.lookup("colmap-processor", "run_colmap");
  // return await f.remote(jobData);

  // For now, this is a placeholder that calls via HTTP
  // You need to deploy the Modal function first and get its URL
  const modalUrl = process.env.MODAL_COLMAP_URL;
  if (!modalUrl) {
    throw new Error("MODAL_COLMAP_URL not configured");
  }

  const response = await fetch(modalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MODAL_TOKEN}`,
    },
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Modal COLMAP failed: ${error}`);
  }

  return await response.json() as ColmapResult;
}

// Create worker
const worker = new Worker<ColmapJobData, ColmapResult>(
  "colmap",
  async (job: Job<ColmapJobData>) => {
    console.log(`[COLMAP] Processing job ${job.id}`);
    const { presentationId, stageId, inputFileKey } = job.data;

    try {
      // Update stage status to IN_PROGRESS
      await db
        .update(processingStage)
        .set({
          status: "IN_PROGRESS",
          startedAt: new Date(),
        })
        .where(eq(processingStage.id, stageId));

      // Call Modal function
      const result = await callModalColmap(job.data);

      // Update stage with results
      await db
        .update(processingStage)
        .set({
          status: "COMPLETED",
          completedAt: new Date(),
          outputFileKey: result.outputKey,
          outputFileSize: result.outputSize,
          metadata: result.metadata,
        })
        .where(eq(processingStage.id, stageId));

      // Trigger next stage
      const { triggerNextStage } = await import(
        "../services/pipeline-orchestrator"
      );
      await triggerNextStage(db, presentationId);

      return result;
    } catch (error) {
      console.error(`[COLMAP] Job ${job.id} failed:`, error);

      // Update stage with error
      await db
        .update(processingStage)
        .set({
          status: "FAILED",
          completedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        })
        .where(eq(processingStage.id, stageId));

      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // GPU jobs are expensive, process one at a time
  },
);

worker.on("completed", (job) => {
  console.log(`[COLMAP] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[COLMAP] Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("[COLMAP] Worker error:", err);
});

console.log("[COLMAP] Worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[COLMAP] SIGTERM received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
