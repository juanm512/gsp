/**
 * Bull Board Dashboard for Local Development
 *
 * This provides a web UI to monitor BullMQ jobs and queues.
 *
 * Usage:
 *   pnpm add -D @bull-board/api @bull-board/express
 *   tsx src/mocks/dashboard.ts
 *
 * Then open: http://localhost:3001/admin/queues
 */

import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { queues } from "../config/queues";

const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(queues.extractFrames),
    new BullMQAdapter(queues.validateOverlap),
    new BullMQAdapter(queues.colmap),
    new BullMQAdapter(queues.brushTraining),
    new BullMQAdapter(queues.convertSog),
  ],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.get("/", (req, res) => {
  res.redirect("/admin/queues");
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`\n📊 Bull Board Dashboard running on http://localhost:${PORT}/admin/queues\n`);
  console.log(`Features:`);
  console.log(`  - View all queues and their jobs`);
  console.log(`  - Monitor job progress`);
  console.log(`  - Retry failed jobs`);
  console.log(`  - View job logs and data\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\nShutting down dashboard...");
  process.exit(0);
});
