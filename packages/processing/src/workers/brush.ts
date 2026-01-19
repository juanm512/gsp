import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { db } from "@acme/db/client";
import { processingStage } from "@acme/db/schema";
import { eq } from "@acme/db";

interface BrushJobData {
  presentationId: string;
  stageId: string;
  inputFileKey: string;
}

interface BrushResult {
  outputKey: string;
  outputSize: number;
  metadata: {
    plyVertices: number;
    iterations: number;
    trainingCompleted: boolean;
  };
}

// Redis connection
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Import Modal function
async function callModalBrush(jobData: BrushJobData): Promise<BrushResult> {
  // Use Modal's SDK to call the deployed function
  // Example: const modal = await import('modal');
  // const f = modal.Function.lookup("brush-processor", "train_gaussian_splatting");
  // return await f.remote(jobData);

  // For now, this is a placeholder that calls via HTTP
  const modalUrl = process.env.MODAL_BRUSH_URL;
  if (!modalUrl) {
    throw new Error("MODAL_BRUSH_URL not configured");
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
    throw new Error(`Modal Brush failed: ${error}`);
  }

  return (await response.json()) as BrushResult;
}

// Create worker
const worker = new Worker<BrushJobData, BrushResult>(
  "brush-training",
  async (job: Job<BrushJobData>) => {
    console.log(`[Brush] Processing job ${job.id}`);
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
      const result = await callModalBrush(job.data);

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
      console.error(`[Brush] Job ${job.id} failed:`, error);

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
  console.log(`[Brush] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Brush] Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("[Brush] Worker error:", err);
});

console.log("[Brush] Worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Brush] SIGTERM received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
