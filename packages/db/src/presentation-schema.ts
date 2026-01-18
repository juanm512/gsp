import { pgTable, text, timestamp, integer, pgEnum, json, bigint, real, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user, organization } from "./auth-schema";

// ============================================
// ENUMS
// ============================================

export const presentationStatusEnum = pgEnum("presentation_status", [
    "draft",           // Usuario creó pero no subió material
    "pending_review",  // Material subido, esperando aprobación
    "rejected",        // Material rechazado
    "approved",        // Material aprobado, esperando procesamiento
    "processing",      // En proceso por admin
    "completed",       // Finalizado y listo para visualizar
    "failed",          // Error en procesamiento
]);

// Processing pipeline enums
export const stageTypeEnum = pgEnum("stage_type", [
    "EXTRACT_FRAMES",
    "VALIDATE_OVERLAP",
    "COLMAP",
    "BRUSH_TRAINING",
    "OPTIMIZE_PLY",
    "CONVERT_SOG",
    "VALIDATE_SOG",
    "ADMIN_APPROVAL",
]);

export const stageStatusEnum = pgEnum("stage_status", [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "FAILED",
    "SKIPPED",
    "CANCELLED",
]);

export const processingModeEnum = pgEnum("processing_mode", [
    "AUTO",    // Automatizado en worker
    "MANUAL",  // Requiere acción de admin
]);

export const uploadTypeEnum = pgEnum("upload_type", [
    "video",
    "images_zip",
    "gaussian_file",   // .sog, .splat, .ply, .compressed.ply
]);

// Removed uploadStatusEnum as it's redundant

export const processedFileTypeEnum = pgEnum("processed_file_type", [
    "extracted_frames",  // ZIP con frames extraídos
    "colmap_data",       // Datos de COLMAP
    "ply_raw",           // .ply generado por Brush
    "ply_optimized",     // .ply optimizado por admin
    "splat_file",        // .splat file
    "sog_final",         // .sog final para visualización
]);

// ============================================
// TABLES
// ============================================

export const presentation = pgTable("presentation", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),

    // Location (optional, for map features)
    latitude: text("latitude"),
    longitude: text("longitude"),
    address: text("address"),

    // Relationships
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").notNull().references(() => user.id),

    // Admin assignment (admin can claim/assign presentations)
    assignedToId: text("assigned_to_id").references(() => user.id),

    // Status & Active file
    status: presentationStatusEnum("status").default("draft").notNull(),
    activeFileKey: text("active_file_key"), // Key del archivo usado para visualización
    thumbnailKey: text("thumbnail_key"),    // Miniatura para previews

    // Upload information for pipeline
    uploadFileKey: text("upload_file_key"), // Original uploaded file
    uploadFileSize: bigint("upload_file_size", { mode: "number" }), // Size in bytes

    // Pipeline state
    currentStage: stageTypeEnum("current_stage"), // Current stage in the pipeline

    // Public access
    isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
    publicUrl: text("public_url"), // URL for public viewing

    // Rejection/failure info
    rejectionReason: text("rejection_reason"),
    failedReason: text("failed_reason"),

    // Admin notes
    adminNotes: text("admin_notes"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const upload = pgTable("upload", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    presentationId: text("presentation_id").notNull().references(() => presentation.id, { onDelete: "cascade" }),

    // File info
    type: uploadTypeEnum("type").notNull(),
    originalName: text("original_name").notNull(),
    fileKey: text("file_key").notNull(),  // Key en S3/R2
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type"),

    // Processing info
    frameCount: integer("frame_count"),  // Si es video, cuántos frames se extrajeron

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const processedFile = pgTable("processed_file", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    presentationId: text("presentation_id").notNull().references(() => presentation.id, { onDelete: "cascade" }),

    // File info
    type: processedFileTypeEnum("type").notNull(),
    fileKey: text("file_key").notNull(),  // Key en S3/R2
    fileSize: integer("file_size").notNull(),
    originalName: text("original_name"),

    // Which admin uploaded it
    uploadedById: text("uploaded_by_id").references(() => user.id),

    // Notes
    notes: text("notes"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const processingStage = pgTable("processing_stage", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    presentationId: text("presentation_id")
        .notNull()
        .references(() => presentation.id, { onDelete: "cascade" }),

    // Stage type and configuration
    stage: stageTypeEnum("stage").notNull(),
    status: stageStatusEnum("status").default("PENDING").notNull(),
    mode: processingModeEnum("mode").notNull(),
    order: integer("order").notNull(), // Order in the pipeline

    // Execution details
    processingType: text("processing_type"), // "CPU" | "GPU"
    provider: text("provider"), // "modal", "local", etc.
    instanceType: text("instance_type"), // "T4", "A10G", etc.

    // Timestamps
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationSeconds: integer("duration_seconds"),

    // Files
    inputFileKey: text("input_file_key"),
    outputFileKey: text("output_file_key"),
    outputFileSize: bigint("output_file_size", { mode: "number" }),

    // Costs
    estimatedCost: real("estimated_cost"),
    actualCost: real("actual_cost"),

    // Errors and logs
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    logs: text("logs"),

    // Metadata (flexible JSON for stage-specific data)
    metadata: jsonb("metadata").$type<{
        frameCount?: number;
        overlapScore?: number;
        validImages?: number;
        colmapPoints?: number;
        plyVertices?: number;
        compressionRatio?: number;
        [key: string]: unknown;
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
    index("processing_stage_presentation_idx").on(table.presentationId),
    index("processing_stage_status_idx").on(table.status),
    index("processing_stage_order_idx").on(table.presentationId, table.order),
]);

// ============================================
// RELATIONS
// ============================================

export const presentationRelations = relations(presentation, ({ one, many }) => ({
    organization: one(organization, {
        fields: [presentation.organizationId],
        references: [organization.id],
    }),
    createdBy: one(user, {
        fields: [presentation.createdById],
        references: [user.id],
        relationName: "presentationCreator",
    }),
    assignedTo: one(user, {
        fields: [presentation.assignedToId],
        references: [user.id],
        relationName: "presentationAssignee",
    }),
    uploads: many(upload),
    processedFiles: many(processedFile),
    processingStages: many(processingStage),
}));

export const uploadRelations = relations(upload, ({ one }) => ({
    presentation: one(presentation, {
        fields: [upload.presentationId],
        references: [presentation.id],
    }),
}));

export const processedFileRelations = relations(processedFile, ({ one }) => ({
    presentation: one(presentation, {
        fields: [processedFile.presentationId],
        references: [presentation.id],
    }),
    uploadedBy: one(user, {
        fields: [processedFile.uploadedById],
        references: [user.id],
    }),
}));

export const processingStageRelations = relations(processingStage, ({ one }) => ({
    presentation: one(presentation, {
        fields: [processingStage.presentationId],
        references: [presentation.id],
    }),
}));
