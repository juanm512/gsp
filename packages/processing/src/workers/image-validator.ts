import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@acme/db/client";
import { processingStage } from "@acme/db/schema";
import { eq } from "@acme/db";

const execAsync = promisify(exec);

interface ImageValidatorJobData {
  presentationId: string;
  stageId: string;
  inputFileKey: string;
}

interface ImageValidatorResult {
  outputKey: string;
  metadata: {
    validImages: number;
    overlapScore: number;
    validPairs: number;
    totalPairs: number;
    successRate: number;
  };
}

// Redis connection
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create worker
const worker = new Worker<ImageValidatorJobData, ImageValidatorResult>(
  "validate-overlap",
  async (job: Job<ImageValidatorJobData>) => {
    console.log(`[ImageValidator] Processing job ${job.id}`);
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

      const jobDataJson = JSON.stringify(job.data);

      // Run Python script
      const scriptPath = `${process.cwd()}/docker/image-validator/validate_images.py`;
      console.log(`[ImageValidator] Running script at: ${scriptPath}`);
      const { stdout } = await execAsync(
        `python3 ${scriptPath}`,
        {
          env: {
            ...process.env,
            JOB_DATA: jobDataJson,
          },
          timeout: 600000, // 10 minutes
        },
      );

      const result: ImageValidatorResult = JSON.parse(stdout);

      // Update stage with results
      await db
        .update(processingStage)
        .set({
          status: "COMPLETED",
          completedAt: new Date(),
          outputFileKey: result.outputKey,
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
      console.error(`[ImageValidator] Job ${job.id} failed:`, error);

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
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`[ImageValidator] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[ImageValidator] Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("[ImageValidator] Worker error:", err);
});

console.log("[ImageValidator] Worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[ImageValidator] SIGTERM received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
