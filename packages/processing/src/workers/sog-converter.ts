import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@acme/db/client";
import { processingStage } from "@acme/db/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);

interface SogConverterJobData {
  presentationId: string;
  stageId: string;
  inputFileKey: string;
}

interface SogConverterResult {
  outputKey: string;
  outputSize: number;
  metadata: {
    inputSize: number;
    outputSize: number;
    compressionRatio: number;
  };
}

// Redis connection
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create worker
const worker = new Worker<SogConverterJobData, SogConverterResult>(
  "convert-sog",
  async (job: Job<SogConverterJobData>) => {
    console.log(`[SogConverter] Processing job ${job.id}`);
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
      const { stdout } = await execAsync(
        `python3 ${process.cwd()}/packages/processing/docker/sog-converter/convert_sog.py`,
        {
          env: {
            ...process.env,
            JOB_DATA: jobDataJson,
          },
          timeout: 600000, // 10 minutes
        },
      );

      const result: SogConverterResult = JSON.parse(stdout);

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
      console.error(`[SogConverter] Job ${job.id} failed:`, error);

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
  console.log(`[SogConverter] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[SogConverter] Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("[SogConverter] Worker error:", err);
});

console.log("[SogConverter] Worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[SogConverter] SIGTERM received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
