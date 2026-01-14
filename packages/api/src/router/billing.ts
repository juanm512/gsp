import { z } from "zod/v4";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { eq, and } from "@acme/db";

import { protectedProcedure } from "../trpc";
import { createCheckout } from "@acme/billing/checkout";
import { PLANS } from "@acme/billing/plans";
import { member, organization } from "@acme/db/schema";

export const billingRouter = {
    createCheckout: protectedProcedure
        .input(
            z.object({
                plan: z.enum(["pro"]),
                organizationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { plan, organizationId } = input;

            // Verify user is a member with owner/admin role
            const userMember = await ctx.db.query.member.findFirst({
                where: and(
                    eq(member.userId, ctx.session.user.id),
                    eq(member.organizationId, organizationId)
                ),
            });

            if (!userMember || (userMember.role !== "owner")) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only organization admins can manage billing" });
            }

            const productId = PLANS.PRO.productId;

            const checkout = await createCheckout({
                productId,
                successUrl: `${ctx.headers.get("origin")}/dashboard/organizations/${organizationId}/settings/subscription?success=true`,
                organizationId,
                customerEmail: ctx.session.user.email,
            });

            return { url: checkout.url };
        }),

    getSubscription: protectedProcedure
        .input(z.object({ organizationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { organizationId } = input;

            // Verify user is a member
            const userMember = await ctx.db.query.member.findFirst({
                where: and(
                    eq(member.userId, ctx.session.user.id),
                    eq(member.organizationId, organizationId)
                ),
            });

            if (!userMember) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
            }

            // Get organization with plan info
            const org = await ctx.db.query.organization.findFirst({
                where: eq(organization.id, organizationId),
            });

            if (!org) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
            }

            // Count members
            const members = await ctx.db.query.member.findMany({
                where: eq(member.organizationId, organizationId),
            });

            return {
                plan: (org as any).plan || "free",
                planExpiresAt: (org as any).planExpiresAt,
                polarSubscriptionId: (org as any).polarSubscriptionId,
                polarCustomerId: (org as any).polarCustomerId,
                memberCount: members.length,
            };
        }),

    getCustomerPortalUrl: protectedProcedure
        .input(z.object({ organizationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { organizationId } = input;

            // Get organization
            const org = await ctx.db.query.organization.findFirst({
                where: eq(organization.id, organizationId),
            });

            if (!org || !(org as any).polarCustomerId) {
                throw new TRPCError({ code: "NOT_FOUND", message: "No billing account found" });
            }

            // Polar customer portal URL
            const portalUrl = `https://polar.sh/purchases/subscriptions`;

            return { url: portalUrl };
        }),
} satisfies TRPCRouterRecord;
