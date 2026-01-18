/**
 * Worker Entry Point
 *
 * This file starts all BullMQ workers based on environment configuration.
 * You can run all workers together or separately by setting WORKER_TYPE env var.
 *
 * Usage:
 *   - All workers: npm start
 *   - Specific worker: WORKER_TYPE=frame-extractor npm start
 *   - Multiple workers: WORKER_TYPE=frame-extractor,image-validator npm start
 */

const WORKER_TYPE = process.env.WORKER_TYPE;

async function startWorkers() {
  console.log("Starting processing workers...");
  console.log(`Redis URL: ${process.env.REDIS_URL}`);

  // Determine which workers to start
  const workersToStart = WORKER_TYPE
    ? WORKER_TYPE.split(",").map((w) => w.trim())
    : ["frame-extractor", "image-validator", "sog-converter", "colmap", "brush"];

  console.log(`Starting workers: ${workersToStart.join(", ")}`);

  // Start workers
  const workerPromises = workersToStart.map(async (workerType) => {
    switch (workerType) {
      case "frame-extractor":
        await import("./workers/frame-extractor");
        console.log("✓ Frame Extractor worker started");
        break;
      case "image-validator":
        await import("./workers/image-validator");
        console.log("✓ Image Validator worker started");
        break;
      case "sog-converter":
        await import("./workers/sog-converter");
        console.log("✓ SOG Converter worker started");
        break;
      case "colmap":
        await import("./workers/colmap");
        console.log("✓ COLMAP worker started");
        break;
      case "brush":
        await import("./workers/brush");
        console.log("✓ Brush Training worker started");
        break;
      default:
        console.error(`Unknown worker type: ${workerType}`);
    }
  });

  await Promise.all(workerPromises);

  console.log("\n✓ All workers started successfully");
  console.log("Waiting for jobs...\n");
}

// Start workers
startWorkers().catch((error) => {
  console.error("Failed to start workers:", error);
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT, shutting down gracefully...");
  process.exit(0);
});
