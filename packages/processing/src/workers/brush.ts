import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { db } from "@acme/db/client";
import { processingStage } from "@acme/db/schema";
import { eq } from "@acme/db";

interface BrushJobData {
  presentationId: string;
  stageId: string;
  inputFileKey: string;
  framesFileKey?: string; // Added: path to original frames ZIP
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

      // Get framesFileKey from COLMAP stage metadata or EXTRACT_FRAMES output
      let framesFileKey = job.data.framesFileKey;
      if (!framesFileKey) {
        // Query all stages for this presentation
        const stages = await db
          .select()
          .from(processingStage)
          .where(eq(processingStage.presentationId, presentationId));

        console.log(`[Brush] Found ${stages.length} stages for presentation ${presentationId}`);

        // First try: Get framesFileKey from COLMAP metadata
        const colmapStage = stages.find((s) => s.stage === "COLMAP" && s.status === "COMPLETED");
        if (colmapStage?.metadata && typeof colmapStage.metadata === "object") {
          const metadata = colmapStage.metadata as Record<string, unknown>;
          framesFileKey = metadata.framesFileKey as string | undefined;
          console.log(`[Brush] COLMAP metadata: ${JSON.stringify(colmapStage.metadata)}`);
        }

        // Fallback: Get outputFileKey from EXTRACT_FRAMES stage
        if (!framesFileKey) {
          const extractFramesStage = stages.find(
            (s) => s.stage === "EXTRACT_FRAMES" && s.status === "COMPLETED"
          );
          if (extractFramesStage?.outputFileKey) {
            framesFileKey = extractFramesStage.outputFileKey;
            console.log(`[Brush] Using EXTRACT_FRAMES outputFileKey: ${framesFileKey}`);
          }
        }

        console.log(`[Brush] Final framesFileKey: ${framesFileKey}`);
      }

      // Call Modal function with framesFileKey
      const result = await callModalBrush({
        ...job.data,
        framesFileKey,
      });

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
    // Prevent retry loops from hammering Redis
    limiter: {
      max: 1,
      duration: 60000, // Max 1 job per minute when failing
    },
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
