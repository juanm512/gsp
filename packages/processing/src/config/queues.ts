import { Queue } from "bullmq";
import { Redis } from "ioredis";

// Redis connection configuration
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Define all processing queues
export const extractFramesQueue = new Queue("extract-frames", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

export const validateOverlapQueue = new Queue("validate-overlap", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export const colmapQueue = new Queue("colmap", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // GPU jobs are expensive, fewer retries
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export const brushTrainingQueue = new Queue("brush-training", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // GPU jobs are expensive, fewer retries
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export const convertSogQueue = new Queue("convert-sog", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

// Export all queues as a map for easier access
export const queues = {
  extractFrames: extractFramesQueue,
  validateOverlap: validateOverlapQueue,
  colmap: colmapQueue,
  brushTraining: brushTrainingQueue,
  convertSog: convertSogQueue,
} as const;

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing queues...");
  await Promise.all([
    extractFramesQueue.close(),
    validateOverlapQueue.close(),
    colmapQueue.close(),
    brushTrainingQueue.close(),
    convertSogQueue.close(),
  ]);
  await redisConnection.quit();
  process.exit(0);
});
