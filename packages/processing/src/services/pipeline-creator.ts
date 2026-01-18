import { eq } from "drizzle-orm";

type UploadType = "video" | "images_zip" | "gaussian_file";

interface StageDefinition {
  stage: string;
  mode: "AUTO" | "MANUAL";
  processingType?: "CPU" | "GPU";
  order: number;
}

const PIPELINE_DEFINITIONS: Record<UploadType, StageDefinition[]> = {
  video: [
    {
      stage: "EXTRACT_FRAMES",
      mode: "AUTO",
      processingType: "CPU",
      order: 1,
    },
    {
      stage: "VALIDATE_OVERLAP",
      mode: "AUTO",
      processingType: "CPU",
      order: 2,
    },
    { stage: "COLMAP", mode: "AUTO", processingType: "GPU", order: 3 },
    { stage: "BRUSH_TRAINING", mode: "AUTO", processingType: "GPU", order: 4 },
    { stage: "OPTIMIZE_PLY", mode: "MANUAL", order: 5 },
    { stage: "CONVERT_SOG", mode: "AUTO", processingType: "GPU", order: 6 },
    { stage: "ADMIN_APPROVAL", mode: "MANUAL", order: 7 },
  ],

  images_zip: [
    {
      stage: "VALIDATE_OVERLAP",
      mode: "AUTO",
      processingType: "CPU",
      order: 1,
    },
    { stage: "COLMAP", mode: "AUTO", processingType: "GPU", order: 2 },
    { stage: "BRUSH_TRAINING", mode: "AUTO", processingType: "GPU", order: 3 },
    { stage: "OPTIMIZE_PLY", mode: "MANUAL", order: 4 },
    { stage: "CONVERT_SOG", mode: "AUTO", processingType: "GPU", order: 5 },
    { stage: "ADMIN_APPROVAL", mode: "MANUAL", order: 6 },
  ],

  gaussian_file: [
    // For .ply, .splat files
    { stage: "OPTIMIZE_PLY", mode: "MANUAL", order: 1 },
    { stage: "CONVERT_SOG", mode: "AUTO", processingType: "GPU", order: 2 },
    { stage: "ADMIN_APPROVAL", mode: "MANUAL", order: 3 },
  ],
};

/**
 * Creates pipeline stages for a presentation based on upload type
 */
export async function createPipelineStages(
  db: any,
  presentationId: string,
  uploadType: UploadType,
): Promise<void> {
  const { processingStage, presentation } = await import("@acme/db/schema");

  const stages = PIPELINE_DEFINITIONS[uploadType];

  if (!stages) {
    throw new Error(`Invalid upload type: ${uploadType}`);
  }

  const stageRecords = stages.map((stage) => ({
    presentationId,
    stage: stage.stage as any,
    mode: stage.mode as any,
    order: stage.order,
    status: "PENDING" as const,
    processingType: stage.processingType as any,
  }));

  await db.insert(processingStage).values(stageRecords);

  // Update presentation with first stage
  await db
    .update(presentation)
    .set({
      currentStage: stages[0]!.stage as any,
      status: "processing",
    })
    .where(eq(presentation.id, presentationId));
}
