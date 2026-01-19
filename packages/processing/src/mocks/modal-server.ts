/**
 * Mock Modal GPU Functions for Local Development
 *
 * This server mocks the Modal GPU functions (COLMAP and Brush)
 * so you can test the full pipeline locally without deploying to Modal.
 *
 * Usage:
 *   tsx src/mocks/modal-server.ts
 *
 * Then set in .env.local:
 *   MODAL_COLMAP_URL="http://localhost:8001/colmap"
 *   MODAL_BRUSH_URL="http://localhost:8001/brush"
 */

import express from "express";

const app = express();
app.use(express.json());

// Mock COLMAP processor
app.post("/colmap", async (req, res) => {
  const { presentationId, stageId, inputFileKey } = req.body;

  console.log(`\n[Mock COLMAP] 🎬 Processing ${stageId}`);
  console.log(`  Presentation: ${presentationId}`);
  console.log(`  Input: ${inputFileKey}`);

  try {
    // Simulate GPU processing time
    console.log(`  Running COLMAP feature extraction...`);
    await sleep(2000);

    console.log(`  Running COLMAP matching...`);
    await sleep(2000);

    console.log(`  Running COLMAP reconstruction...`);
    await sleep(1000);

    // Mock result
    const result = {
      outputKey: `colmap-output-${Date.now()}.zip`,
      outputSize: 1024 * 1024 * 50, // 50MB
      metadata: {
        imageCount: 100,
        cameraCount: 1,
        pointCount: 50000,
        colmapSuccess: true,
      },
    };

    console.log(`  ✓ COLMAP completed successfully`);
    console.log(`  Output: ${result.outputKey}`);
    console.log(`  Points: ${result.metadata.pointCount}`);

    res.json(result);
  } catch (error) {
    console.error(`  ✗ COLMAP failed:`, error);
    res.status(500).json({ error: "COLMAP processing failed" });
  }
});

// Mock Brush (Gaussian Splatting) processor
app.post("/brush", async (req, res) => {
  const { presentationId, stageId, inputFileKey } = req.body;

  console.log(`\n[Mock Brush] 🎨 Processing ${stageId}`);
  console.log(`  Presentation: ${presentationId}`);
  console.log(`  Input: ${inputFileKey}`);

  try {
    // Simulate GPU training time
    console.log(`  Initializing Gaussian Splatting...`);
    await sleep(1000);

    console.log(`  Training iteration 0-10000...`);
    await sleep(3000);

    console.log(`  Training iteration 10000-20000...`);
    await sleep(3000);

    console.log(`  Training iteration 20000-30000...`);
    await sleep(3000);

    console.log(`  Exporting PLY...`);
    await sleep(1000);

    // Mock result
    const result = {
      outputKey: `brush-output-${Date.now()}.ply`,
      outputSize: 1024 * 1024 * 100, // 100MB
      metadata: {
        plyVertices: 500000,
        iterations: 30000,
        trainingCompleted: true,
        finalLoss: 0.0234,
      },
    };

    console.log(`  ✓ Brush training completed successfully`);
    console.log(`  Output: ${result.outputKey}`);
    console.log(`  Vertices: ${result.metadata.plyVertices}`);
    console.log(`  Final Loss: ${result.metadata.finalLoss}`);

    res.json(result);
  } catch (error) {
    console.error(`  ✗ Brush training failed:`, error);
    res.status(500).json({ error: "Brush training failed" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", mock: true });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PORT = 8001;

app.listen(PORT, () => {
  console.log(`\n🎭 Mock Modal GPU Functions running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST http://localhost:${PORT}/colmap`);
  console.log(`  POST http://localhost:${PORT}/brush`);
  console.log(`  GET  http://localhost:${PORT}/health\n`);
  console.log(`Set in .env.local:`);
  console.log(`  MODAL_COLMAP_URL="http://localhost:${PORT}/colmap"`);
  console.log(`  MODAL_BRUSH_URL="http://localhost:${PORT}/brush"`);
  console.log(`  MODAL_TOKEN="local-dev-token"\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\nShutting down mock server...");
  process.exit(0);
});
