import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleWebhook } from "@acme/billing/webhooks";
import { db } from "@acme/db/client";
import { organization } from "@acme/db/schema";
import { eq } from "@acme/db";
import { env } from "~/env";

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const polarWebhookSecret = env.POLAR_WEBHOOK_SECRET;
    console.error("POLAR ENDPOINT WEBHOOK RECEIVED A POST REQUEST");

    if (!polarWebhookSecret) {
        console.error("POLAR_WEBHOOK_SECRET is not set");
        return new NextResponse("Internal Server Error", { status: 500 });
    }

    // Convert headers to Record<string, string>
    const headersRecord: Record<string, string> = {};
    headersList.forEach((value, key) => {
        headersRecord[key] = value;
    });

    try {
        const event = await handleWebhook(body, headersRecord, polarWebhookSecret);

        if (event.type === "subscription.created" || event.type === "subscription.updated") {
            console.log(event.type);

            const subscription = event.data;
            const orgId = subscription.metadata?.organizationId as string | undefined;

            if (orgId) {
                await db.update(organization).set({
                    polarCustomerId: subscription.customerId,
                    polarSubscriptionId: subscription.id,
                    plan: "pro", // Assuming only "pro" plan for now or derive from productId
                    planExpiresAt: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
                } as any).where(eq(organization.id, orgId));
            }
        } else if (event.type === "subscription.revoked" || event.type === "subscription.canceled") {
            // Handle cancellation logic (downgrade to free)
            const subscription = event.data;
            // Find org by subscription ID if metadata not available in this event type

            // Simplification: We might need to query org by subscription ID
            // await db.update(organization).set({ plan: "free" }).where(eq(organization.polarSubscriptionId, subscription.id));
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err) {
        console.error("Webhook Error:", err);
        return new NextResponse("Webhook verification failed", { status: 400 });
    }
}
