import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";
import { eq, desc, like, or } from "@acme/db";

import { user, organization, session } from "@acme/db/schema";

import { superAdminProcedure } from "../trpc";

export const adminRouter = {
    /**
     * List all users (superadmin only)
     */
    listUsers: superAdminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).optional().default(50),
                offset: z.number().min(0).optional().default(0),
                search: z.string().optional(),
                roleFilter: z.enum(["all", "user", "admin", "superadmin"]).optional().default("all"),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const { limit = 50, offset = 0, search, roleFilter = "all" } = input ?? {};

            let query = ctx.db
                .select({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image,
                    role: user.role,
                    banned: user.banned,
                    banReason: user.banReason,
                    banExpires: user.banExpires,
                    createdAt: user.createdAt,
                })
                .from(user)
                .orderBy(desc(user.createdAt))
                .limit(limit)
                .offset(offset);

            // Build where conditions
            const conditions = [];

            if (search) {
                conditions.push(
                    or(
                        like(user.name, `%${search}%`),
                        like(user.email, `%${search}%`)
                    )
                );
            }

            if (roleFilter !== "all") {
                conditions.push(eq(user.role, roleFilter));
            }

            const users = await query.where(conditions.length > 0 ? or(...conditions) : undefined);

            // Get total count
            const totalResult = await ctx.db
                .select({ count: user.id })
                .from(user);

            return {
                users: users.map((u) => ({
                    ...u,
                    role: u.role ?? "user", // Default to "user" if null
                })),
                total: totalResult.length,
            };
        }),

    /**
     * Change user role (superadmin only)
     */
    setUserRole: superAdminProcedure
        .input(
            z.object({
                userId: z.string(),
                role: z.enum(["user", "admin", "superadmin"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId, role } = input;

            // Don't allow changing own role
            if (userId === ctx.session.user.id) {
                throw new Error("No puedes cambiar tu propio rol");
            }

            await ctx.db.update(user).set({ role }).where(eq(user.id, userId));

            return { success: true };
        }),

    /**
     * Ban/unban user (superadmin only)
     */
    setBanStatus: superAdminProcedure
        .input(
            z.object({
                userId: z.string(),
                banned: z.boolean(),
                banReason: z.string().optional(),
                banExpires: z.date().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId, banned, banReason, banExpires } = input;

            // Don't allow banning self
            if (userId === ctx.session.user.id) {
                throw new Error("No puedes banearte a ti mismo");
            }

            await ctx.db
                .update(user)
                .set({
                    banned,
                    banReason: banned ? banReason : null,
                    banExpires: banned ? banExpires : null,
                })
                .where(eq(user.id, userId));

            // If banning, revoke all sessions
            if (banned) {
                await ctx.db.delete(session).where(eq(session.userId, userId));
            }

            return { success: true };
        }),
    /**
     * List all organizations (superadmin only)
     */
    listOrganizations: superAdminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).optional().default(50),
                offset: z.number().min(0).optional().default(0),
                search: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const { limit = 50, offset = 0, search } = input ?? {};

            let query = ctx.db
                .select()
                .from(organization)
                .orderBy(desc(organization.createdAt))
                .limit(limit)
                .offset(offset);

            // Build where conditions
            const conditions = [];

            if (search) {
                conditions.push(
                    like(organization.name, `%${search}%`)
                );
            }

            const organizations = await query.where(conditions.length > 0 ? or(...conditions) : undefined);

            // Get total count
            const totalResult = await ctx.db
                .select({ count: organization.id })
                .from(organization);

            return {
                organizations,
                total: totalResult.length,
            };
        }),
} satisfies TRPCRouterRecord;