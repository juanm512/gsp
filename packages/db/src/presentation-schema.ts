import { pgTable, text, timestamp, integer, pgEnum, json } from "drizzle-orm/pg-core";
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
