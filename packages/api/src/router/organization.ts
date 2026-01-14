import type { TRPCRouterRecord } from "@trpc/server";
import { eq, and } from "@acme/db";

import { invitation, organization } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const organizationRouter = {
    /**
     * Get pending invitations for the current user (by email)
     */
    getMyPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
        const userEmail = ctx.session.user.email;

        const pendingInvitations = await ctx.db
            .select({
                id: invitation.id,
                organizationId: invitation.organizationId,
                organizationName: organization.name,
                organizationSlug: organization.slug,
                organizationLogo: organization.logo,
                role: invitation.role,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                createdAt: invitation.createdAt,
            })
            .from(invitation)
            .innerJoin(organization, eq(invitation.organizationId, organization.id))
            .where(
                and(
                    eq(invitation.email, userEmail),
                    eq(invitation.status, "pending")
                )
            );

        return pendingInvitations;
    }),
} satisfies TRPCRouterRecord;
