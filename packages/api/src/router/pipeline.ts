import { z } from "zod/v4";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "@acme/db";
import {
  completeManualStage,
  retryStage,
  skipStage,
  cancelStage,
  changeStageMode,
} from "@acme/processing";

import { adminProcedure } from "../trpc";
import { processingStage } from "@acme/db/schema";

export const pipelineRouter = {
  /**
   * Get all stages for a presentation
   */
  getStages: adminProcedure
    .input(z.object({ presentationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stages = await ctx.db.query.processingStage.findMany({
        where: eq(processingStage.presentationId, input.presentationId),
        orderBy: [desc(processingStage.order)],
      });

      return stages;
    }),

  /**
   * Complete a manual stage
   */
  completeStage: adminProcedure
    .input(
      z.object({
        stageId: z.string(),
        outputFileKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await completeManualStage(ctx.db, input.stageId, input.outputFileKey);

      return { success: true };
    }),

  /**
   * Retry a failed stage
   */
  retryStage: adminProcedure
    .input(z.object({ stageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await retryStage(ctx.db, input.stageId);

      return { success: true };
    }),

  /**
   * Skip a stage
   */
  skipStage: adminProcedure
    .input(z.object({ stageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await skipStage(ctx.db, input.stageId);

      return { success: true };
    }),

  /**
   * Cancel an in-progress stage
   */
  cancelStage: adminProcedure
    .input(z.object({ stageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await cancelStage(ctx.db, input.stageId);

      return { success: true };
    }),

  /**
   * Change stage mode (AUTO <-> MANUAL)
   */
  changeStageMode: adminProcedure
    .input(
      z.object({
        stageId: z.string(),
        mode: z.enum(["AUTO", "MANUAL"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await changeStageMode(ctx.db, input.stageId, input.mode);

      return { success: true };
    }),

  /**
   * Update stage with custom data (for file uploads, etc.)
   */
  updateStage: adminProcedure
    .input(
      z.object({
        stageId: z.string(),
        outputFileKey: z.string().optional(),
        outputFileSize: z.number().optional(),
        metadata: z.object(z.unknown()).optional(),
        logs: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { stageId, ...updates } = input;

      const [updated] = await ctx.db
        .update(processingStage)
        .set(updates)
        .where(eq(processingStage.id, stageId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stage not found",
        });
      }

      return updated;
    }),
} satisfies TRPCRouterRecord;
