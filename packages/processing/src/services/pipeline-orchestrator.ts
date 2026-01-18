import { eq, and, asc } from "drizzle-orm";

/**
 * Triggers the next pending stage in the pipeline for a presentation
 */
export async function triggerNextStage(
  db: any,
  presentationId: string,
): Promise<void> {
  const { processingStage, presentation } = await import("@acme/db/schema");

  // Get next pending stage ordered by order field
  const nextStage = await db.query.processingStage.findFirst({
    where: and(
      eq(processingStage.presentationId, presentationId),
      eq(processingStage.status, "PENDING"),
    ),
    orderBy: [asc(processingStage.order)],
  });

  if (!nextStage) {
    // No more stages, pipeline completed
    await db
      .update(presentation)
      .set({ status: "completed" })
      .where(eq(presentation.id, presentationId));
    return;
  }

  // Update presentation with current stage
  await db
    .update(presentation)
    .set({ currentStage: nextStage.stage })
    .where(eq(presentation.id, presentationId));

  // If stage is manual, don't trigger it (wait for admin action)
  if (nextStage.mode === "MANUAL") {
    return;
  }

  // Trigger automated stage
  await triggerStage(nextStage);
}

/**
 * Triggers execution of a specific stage
 */
async function triggerStage(stage: any): Promise<void> {
  // TODO: Import queues and trigger appropriate queue
  // For now, this is a placeholder that will be implemented
  // when we create the workers

  const jobData = {
    presentationId: stage.presentationId,
    stageId: stage.id,
    inputFileKey: stage.inputFileKey,
  };

  switch (stage.stage) {
    case "EXTRACT_FRAMES":
      // await queues.extractFrames.add("process", jobData);
      console.log(`[Pipeline] Would trigger EXTRACT_FRAMES for ${stage.id}`);
      break;
    case "VALIDATE_OVERLAP":
      // await queues.validateOverlap.add("process", jobData);
      console.log(`[Pipeline] Would trigger VALIDATE_OVERLAP for ${stage.id}`);
      break;
    case "COLMAP":
      // await queues.colmap.add("process", jobData);
      console.log(`[Pipeline] Would trigger COLMAP for ${stage.id}`);
      break;
    case "BRUSH_TRAINING":
      // await queues.brushTraining.add("process", jobData);
      console.log(`[Pipeline] Would trigger BRUSH_TRAINING for ${stage.id}`);
      break;
    case "CONVERT_SOG":
      // await queues.convertSog.add("process", jobData);
      console.log(`[Pipeline] Would trigger CONVERT_SOG for ${stage.id}`);
      break;
    default:
      console.warn(`[Pipeline] Unknown stage type: ${stage.stage}`);
  }
}

/**
 * Marks a manual stage as completed and triggers next stage
 */
export async function completeManualStage(
  db: any,
  stageId: string,
  outputFileKey?: string,
): Promise<void> {
  const { processingStage, presentation } = await import("@acme/db/schema");

  const stage = await db.query.processingStage.findFirst({
    where: eq(processingStage.id, stageId),
  });

  if (!stage) {
    throw new Error("Stage not found");
  }

  await db
    .update(processingStage)
    .set({
      status: "COMPLETED",
      completedAt: new Date(),
      outputFileKey,
    })
    .where(eq(processingStage.id, stageId));

  // If this is ADMIN_APPROVAL, mark presentation as completed and public
  if (stage.stage === "ADMIN_APPROVAL") {
    await db
      .update(presentation)
      .set({
        status: "completed",
        isPublic: true,
        publicUrl: `https://gsp.app/view/${stage.presentationId}`, // TODO: Use proper URL
      })
      .where(eq(presentation.id, stage.presentationId));
  } else {
    // Continue pipeline
    await triggerNextStage(db, stage.presentationId);
  }
}

/**
 * Retries a failed stage
 */
export async function retryStage(db: any, stageId: string): Promise<void> {
  const { processingStage } = await import("@acme/db/schema");

  const stage = await db.query.processingStage.findFirst({
    where: eq(processingStage.id, stageId),
  });

  if (!stage) {
    throw new Error("Stage not found");
  }

  // Reset stage to pending
  await db
    .update(processingStage)
    .set({
      status: "PENDING",
      errorMessage: null,
      errorStack: null,
      startedAt: null,
      completedAt: null,
    })
    .where(eq(processingStage.id, stageId));

  // If this is the current stage, trigger it
  const presentation = await db.query.presentation.findFirst({
    where: eq((await import("@acme/db/schema")).presentation.id, stage.presentationId),
  });

  if (presentation?.currentStage === stage.stage) {
    await triggerStage(stage);
  }
}

/**
 * Skips a stage in the pipeline
 */
export async function skipStage(db: any, stageId: string): Promise<void> {
  const { processingStage } = await import("@acme/db/schema");

  const stage = await db.query.processingStage.findFirst({
    where: eq(processingStage.id, stageId),
  });

  if (!stage) {
    throw new Error("Stage not found");
  }

  await db
    .update(processingStage)
    .set({
      status: "SKIPPED",
      completedAt: new Date(),
    })
    .where(eq(processingStage.id, stageId));

  // Trigger next stage
  await triggerNextStage(db, stage.presentationId);
}

/**
 * Cancels an in-progress stage
 */
export async function cancelStage(db: any, stageId: string): Promise<void> {
  const { processingStage } = await import("@acme/db/schema");

  const stage = await db.query.processingStage.findFirst({
    where: eq(processingStage.id, stageId),
  });

  if (!stage) {
    throw new Error("Stage not found");
  }

  await db
    .update(processingStage)
    .set({
      status: "CANCELLED",
      completedAt: new Date(),
    })
    .where(eq(processingStage.id, stageId));

  // Note: This doesn't trigger next stage - cancellation stops the pipeline
}

/**
 * Changes the mode of a stage from AUTO to MANUAL or vice versa
 */
export async function changeStageMode(
  db: any,
  stageId: string,
  newMode: "AUTO" | "MANUAL",
): Promise<void> {
  const { processingStage } = await import("@acme/db/schema");

  await db
    .update(processingStage)
    .set({
      mode: newMode,
    })
    .where(eq(processingStage.id, stageId));
}
