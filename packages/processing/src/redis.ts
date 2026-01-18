import { Redis } from "ioredis";

// Redis connection configuration
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

// BullMQ connection object (reused across queues and workers)
export const connection = {
  host: new URL(redisUrl).hostname,
  port: parseInt(new URL(redisUrl).port || "6379"),
  maxRetriesPerRequest: null,
};
