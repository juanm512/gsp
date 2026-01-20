import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@acme/db/client";
import { processingStage } from "@acme/db/schema";
import { eq } from "@acme/db";

const execAsync = promisify(exec);

interface FrameExtractorJobData {
  presentationId: string;
  stageId: string;
  inputFileKey: string;
}

interface FrameExtractorResult {
  outputKey: string;
  outputSize: number;
  metadata: {
    frameCount: number;
    fps: number;
  };
}

// Redis connection
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create worker
const worker = new Worker<FrameExtractorJobData, FrameExtractorResult>(
  "extract-frames",
  async (job: Job<FrameExtractorJobData>) => {
    console.log(`[FrameExtractor] Processing job ${job.id}`);
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

      // Call Docker container or Python script
      // This assumes the Docker container is running as a service
      // and has access to the same S3 and can be called via HTTP
      // OR we can run the Python script directly if we have it installed

      const jobDataJson = JSON.stringify(job.data);

      // Option 1: Call Docker container via HTTP (if deployed as a service)
      // const response = await fetch('http://frame-extractor-service/process', {
      //   method: 'POST',
      //   body: jobDataJson,
      // });

      // Option 2: Run Python script directly (requires Python + dependencies)
      // Use path relative to the processing package root
      const scriptPath = `${process.cwd()}/docker/frame-extractor/frame_extractor.py`;
      console.log(`[FrameExtractor] Running script at: ${scriptPath}`);
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

      // Parse stdout line by line, find the result line
      const lines = stdout.trim().split('\n');
      let result: FrameExtractorResult | null = null;

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'log') {
            console.log(`[FrameExtractor] ${parsed.title}`, parsed.data || '');
          } else if (parsed.type === 'result') {
            result = parsed as FrameExtractorResult;
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error);
          }
        } catch (e) {
          // Skip non-JSON lines
          console.log(`[FrameExtractor] ${line}`);
        }
      }

      if (!result) {
        throw new Error('No result found in Python script output');
      }

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
      console.error(`[FrameExtractor] Job ${job.id} failed:`, error);

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
    concurrency: 1, // Process 1 job at a time to limit memory usage
    lockDuration: 300000, // 5 minutes lock
    stalledInterval: 60000, // Check for stalled jobs every 60s
    maxStalledCount: 3, // Allow 3 stall checks before failing
  },
);

worker.on("completed", (job) => {
  console.log(`[FrameExtractor] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[FrameExtractor] Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("[FrameExtractor] Worker error:", err);
});

console.log("[FrameExtractor] Worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[FrameExtractor] SIGTERM received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
