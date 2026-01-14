import { z } from "zod/v4";
import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, count, isNull } from "@acme/db";
import { storage, getMimeType, sanitizeFilename } from "@acme/storage";

import { protectedProcedure, adminProcedure } from "../trpc";
import { presentation, upload, processedFile, organization } from "@acme/db/schema";
import { canCreatePresentation } from "@acme/billing/limits";

// ============================================
// INPUT SCHEMAS
// ============================================

const createPresentationInput = z.object({
    organizationId: z.string(),
    title: z.string().min(1).max(256),
    description: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    address: z.string().optional(),
});

const listPresentationsInput = z.object({
    organizationId: z.string(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    status: z.enum(["draft", "pending_review", "rejected", "approved", "processing", "completed", "failed"]).optional(),
});

const initiateUploadInput = z.object({
    presentationId: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
    uploadType: z.enum(["video", "images_zip", "gaussian_file"]),
});

// ============================================
// ROUTER
// ============================================

export const presentationRouter = {
    // ========================================
    // USER PROCEDURES
    // ========================================

    /**
     * List presentations for an organization (user view)
     */
    list: protectedProcedure
        .input(listPresentationsInput)
        .query(async ({ ctx, input }) => {
            const { organizationId, limit, offset, status } = input;

            const conditions = [eq(presentation.organizationId, organizationId)];
            if (status) {
                conditions.push(eq(presentation.status, status));
            }

            const presentations = await ctx.db.query.presentation.findMany({
                where: and(...conditions),
                orderBy: [desc(presentation.createdAt)],
                limit,
                offset,
                with: {
                    createdBy: {
                        columns: { id: true, name: true, image: true },
                    },
                },
            });

            const [countResult] = await ctx.db
                .select({ count: count() })
                .from(presentation)
                .where(and(...conditions));

            return {
                presentations,
                total: countResult?.count ?? 0,
            };
        }),

    /**
     * Get presentation by ID with all related data (user view)
     */
    getById: protectedProcedure
        .input(z.object({ presentationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const result = await ctx.db.query.presentation.findFirst({
                where: eq(presentation.id, input.presentationId),
                with: {
                    createdBy: {
                        columns: { id: true, name: true, image: true, email: true },
                    },
                    uploads: {
                        orderBy: [desc(upload.createdAt)],
                    },
                    processedFiles: {
                        orderBy: [desc(processedFile.createdAt)],
                        with: {
                            uploadedBy: {
                                columns: { id: true, name: true },
                            },
                        },
                    },
                },
            });

            if (!result) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Presentation not found" });
            }

            return result;
        }),

    /**
     * Create a new presentation (with feature gating)
     */
    create: protectedProcedure
        .input(createPresentationInput)
        .mutation(async ({ ctx, input }) => {
            const { organizationId, title, description, latitude, longitude, address } = input;

            const org = await ctx.db.query.organization.findFirst({
                where: eq(organization.id, organizationId),
            });

            if (!org) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
            }

            const [countResult] = await ctx.db
                .select({ count: count() })
                .from(presentation)
                .where(eq(presentation.organizationId, organizationId));

            const currentCount = countResult?.count ?? 0;
            const plan = (org as any).plan || "free";
            const { allowed, limit, remaining } = canCreatePresentation(currentCount, plan);

            if (!allowed) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: `Has alcanzado el límite de ${limit} presentaciones para tu plan.`,
                });
            }

            const [newPresentation] = await ctx.db
                .insert(presentation)
                .values({
                    organizationId,
                    createdById: ctx.session.user.id,
                    title,
                    description,
                    latitude,
                    longitude,
                    address,
                    status: "draft",
                })
                .returning();

            return {
                presentation: newPresentation,
                remaining: remaining - 1,
            };
        }),

    /**
     * Update presentation (user)
     */
    update: protectedProcedure
        .input(z.object({
            presentationId: z.string(),
            title: z.string().min(1).max(256).optional(),
            description: z.string().optional(),
            latitude: z.string().optional(),
            longitude: z.string().optional(),
            address: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { presentationId, ...updates } = input;

            const [updated] = await ctx.db
                .update(presentation)
                .set(updates)
                .where(eq(presentation.id, presentationId))
                .returning();

            return updated;
        }),

    /**
     * Delete presentation
     */
    delete: protectedProcedure
        .input(z.object({ presentationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(presentation)
                .where(eq(presentation.id, input.presentationId));

            return { success: true };
        }),

    /**
     * Initiate file upload
     */
    initiateUpload: protectedProcedure
        .input(initiateUploadInput)
        .mutation(async ({ ctx, input }) => {
            const { presentationId, fileName, fileSize, mimeType, uploadType } = input;

            const pres = await ctx.db.query.presentation.findFirst({
                where: eq(presentation.id, presentationId),
                columns: { organizationId: true },
            });

            if (!pres) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Presentation not found" });
            }

            const uuid = randomUUID().slice(0, 8);
            const sanitizedName = sanitizeFilename(fileName);
            const fileKey = `uploads/${pres.organizationId}/${presentationId}/${uuid}_${sanitizedName}`;

            const contentType = mimeType || getMimeType(fileName);
            const presigned = await storage.getPresignedUploadUrl(fileKey, {
                contentType,
                expiresIn: 3600,
            });

            // Status field removed from upload insert
            const [newUpload] = await ctx.db
                .insert(upload)
                .values({
                    presentationId,
                    type: uploadType,
                    originalName: fileName,
                    fileKey,
                    fileSize,
                    mimeType: contentType,
                })
                .returning();

            if (!newUpload) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create upload record" });
            }

            return {
                uploadId: newUpload.id,
                presignedUrl: presigned.url,
                fileKey,
                expiresAt: presigned.expiresAt,
            };
        }),

    /**
     * Confirm upload completed
     */
    confirmUpload: protectedProcedure
        .input(z.object({ uploadId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { uploadId } = input;

            const existingUpload = await ctx.db.query.upload.findFirst({
                where: eq(upload.id, uploadId),
            });

            if (!existingUpload) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
            }

            const exists = await storage.exists(existingUpload.fileKey);
            if (!exists) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "File not found in storage." });
            }

            // No upload status to update

            // Update presentation status to pending_review
            await ctx.db
                .update(presentation)
                .set({ status: "pending_review" })
                .where(eq(presentation.id, existingUpload.presentationId));

            return { success: true, upload: existingUpload };
        }),

    /**
     * Get download URL (user)
     */
    getDownloadUrl: protectedProcedure
        .input(z.object({ fileKey: z.string() }))
        .mutation(async ({ input }) => {
            const presigned = await storage.getPresignedDownloadUrl(input.fileKey, {
                expiresIn: 3600,
            });
            return { url: presigned.url, expiresAt: presigned.expiresAt };
        }),

    // ========================================
    // ADMIN PROCEDURES
    // ========================================

    /**
     * List all presentations (admin view)
     */
    adminList: adminProcedure
        .input(z.object({
            status: z.enum(["draft", "pending_review", "rejected", "approved", "processing", "completed", "failed"]).optional(),
            assignedToMe: z.boolean().optional(),
            unassigned: z.boolean().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const { status, assignedToMe, unassigned, limit, offset } = input;

            const conditions = [];
            if (status) {
                conditions.push(eq(presentation.status, status));
            }
            if (assignedToMe) {
                conditions.push(eq(presentation.assignedToId, ctx.session.user.id));
            }
            if (unassigned) {
                conditions.push(isNull(presentation.assignedToId));
            }

            const presentations = await ctx.db.query.presentation.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                orderBy: [desc(presentation.createdAt)],
                limit,
                offset,
                with: {
                    organization: {
                        columns: { id: true, name: true },
                    },
                    createdBy: {
                        columns: { id: true, name: true, image: true },
                    },
                    assignedTo: {
                        columns: { id: true, name: true, image: true },
                    },
                },
            });

            return { presentations };
        }),

    /**
     * Get presentation details (admin view with all data)
     */
    adminGetById: adminProcedure
        .input(z.object({ presentationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const result = await ctx.db.query.presentation.findFirst({
                where: eq(presentation.id, input.presentationId),
                with: {
                    organization: {
                        columns: { id: true, name: true },
                    },
                    createdBy: {
                        columns: { id: true, name: true, email: true, image: true },
                    },
                    assignedTo: {
                        columns: { id: true, name: true, email: true, image: true },
                    },
                    uploads: {
                        orderBy: [desc(upload.createdAt)],
                    },
                    processedFiles: {
                        orderBy: [desc(processedFile.createdAt)],
                        with: {
                            uploadedBy: {
                                columns: { id: true, name: true },
                            },
                        },
                    },
                },
            });

            if (!result) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Presentation not found" });
            }

            return result;
        }),

    /**
     * Claim presentation (admin assigns to self)
     */
    adminClaim: adminProcedure
        .input(z.object({ presentationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(presentation)
                .set({ assignedToId: ctx.session.user.id })
                .where(eq(presentation.id, input.presentationId))
                .returning();

            return updated;
        }),

    /**
     * Unclaim presentation
     */
    adminUnclaim: adminProcedure
        .input(z.object({ presentationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(presentation)
                .set({ assignedToId: null })
                .where(eq(presentation.id, input.presentationId))
                .returning();

            return updated;
        }),

    /**
     * Update presentation status (admin)
     */
    adminUpdateStatus: adminProcedure
        .input(z.object({
            presentationId: z.string(),
            status: z.enum(["draft", "pending_review", "rejected", "approved", "processing", "completed", "failed"]),
            rejectionReason: z.string().optional(),
            failedReason: z.string().optional(),
            adminNotes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { presentationId, status, rejectionReason, failedReason, adminNotes } = input;

            const updates: Record<string, any> = { status };
            if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
            if (failedReason !== undefined) updates.failedReason = failedReason;
            if (adminNotes !== undefined) updates.adminNotes = adminNotes;

            // Removed update logic for upload status

            const [updated] = await ctx.db
                .update(presentation)
                .set(updates)
                .where(eq(presentation.id, presentationId))
                .returning();

            return updated;
        }),

    /**
     * Set active file for visualization (admin)
     */
    adminSetActiveFile: adminProcedure
        .input(z.object({
            presentationId: z.string(),
            fileKey: z.string().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(presentation)
                .set({
                    activeFileKey: input.fileKey,
                    status: input.fileKey ? "completed" : "processing",
                })
                .where(eq(presentation.id, input.presentationId))
                .returning();

            return updated;
        }),

    /**
     * Initiate processed file upload (admin)
     */
    adminInitiateProcessedFileUpload: adminProcedure
        .input(z.object({
            presentationId: z.string(),
            fileType: z.enum(["extracted_frames", "colmap_data", "ply_raw", "ply_optimized", "splat_file", "sog_final"]),
            fileName: z.string(),
            fileSize: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { presentationId, fileType, fileName } = input;

            const pres = await ctx.db.query.presentation.findFirst({
                where: eq(presentation.id, presentationId),
                columns: { organizationId: true },
            });

            if (!pres) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Presentation not found" });
            }

            const uuid = randomUUID().slice(0, 8);
            const sanitizedName = sanitizeFilename(fileName);
            const fileKey = `processed/${pres.organizationId}/${presentationId}/${fileType}/${uuid}_${sanitizedName}`;

            const contentType = getMimeType(fileName);
            const presigned = await storage.getPresignedUploadUrl(fileKey, {
                contentType,
                expiresIn: 3600,
            });

            return {
                presignedUrl: presigned.url,
                fileKey,
                expiresAt: presigned.expiresAt,
            };
        }),

    /**
     * Confirm processed file upload (admin)
     */
    adminConfirmProcessedFileUpload: adminProcedure
        .input(z.object({
            presentationId: z.string(),
            fileType: z.enum(["extracted_frames", "colmap_data", "ply_raw", "ply_optimized", "splat_file", "sog_final"]),
            fileKey: z.string(),
            fileSize: z.number(),
            originalName: z.string().optional(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { presentationId, fileType, fileKey, fileSize, originalName, notes } = input;

            const exists = await storage.exists(fileKey);
            if (!exists) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "File not found in storage." });
            }

            const [newFile] = await ctx.db
                .insert(processedFile)
                .values({
                    presentationId,
                    type: fileType,
                    fileKey,
                    fileSize,
                    originalName,
                    notes,
                    uploadedById: ctx.session.user.id,
                })
                .returning();

            return newFile;
        }),

    /**
     * Get download URL (admin)
     */
    adminGetDownloadUrl: adminProcedure
        .input(z.object({ fileKey: z.string() }))
        .mutation(async ({ input }) => {
            const presigned = await storage.getPresignedDownloadUrl(input.fileKey, {
                expiresIn: 3600,
            });
            return { url: presigned.url, expiresAt: presigned.expiresAt };
        }),

    /**
     * Delete processed file (admin)
     */
    adminDeleteProcessedFile: adminProcedure
        .input(z.object({ processedFileId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { processedFileId } = input;

            const file = await ctx.db.query.processedFile.findFirst({
                where: eq(processedFile.id, processedFileId),
            });

            if (!file) {
                throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
            }

            // Remove from storage
            try {
                await storage.delete(file.fileKey);
            } catch (error) {
                console.error("Failed to delete file from storage", error);
                // Continue to delete from DB even if storage fails (consistency)
            }

            // If this file was active, unset it
            const pres = await ctx.db.query.presentation.findFirst({
                where: eq(presentation.id, file.presentationId),
                columns: { activeFileKey: true },
            });

            if (pres?.activeFileKey === file.fileKey) {
                await ctx.db
                    .update(presentation)
                    .set({ activeFileKey: null, status: "processing" })
                    .where(eq(presentation.id, file.presentationId));
            }

            // Delete from DB
            await ctx.db
                .delete(processedFile)
                .where(eq(processedFile.id, processedFileId));

            return { success: true };
        }),

} satisfies TRPCRouterRecord;