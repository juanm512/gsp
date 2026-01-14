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

    console.log("[Polar Webhook] Received POST request");

    if (!polarWebhookSecret) {
        console.error("[Polar Webhook] POLAR_WEBHOOK_SECRET is not set");
        return new NextResponse("Internal Server Error", { status: 500 });
    }

    // Convert headers to Record<string, string>
    const headersRecord: Record<string, string> = {};
    headersList.forEach((value, key) => {
        headersRecord[key] = value;
    });

    try {
        const event = await handleWebhook(body, headersRecord, polarWebhookSecret);
        console.log(`[Polar Webhook] Event type: ${event.type}`);

        switch (event.type) {
            // Subscription created or updated (upgrade, renewal)
            case "subscription.created":
            case "subscription.updated":
            case "subscription.active": {
                const subscription = event.data;
                const orgId = subscription.metadata?.organizationId as string | undefined;

                console.log(`[Polar Webhook] Processing subscription for org: ${orgId}`);

                if (orgId) {
                    await db.update(organization).set({
                        polarCustomerId: subscription.customerId,
                        polarSubscriptionId: subscription.id,
                        plan: "pro",
                        planExpiresAt: subscription.currentPeriodEnd
                            ? new Date(subscription.currentPeriodEnd)
                            : null
                    } as any).where(eq(organization.id, orgId));

                    console.log(`[Polar Webhook] Updated org ${orgId} to plan: pro`);
                }
                break;
            }

            // Subscription cancelled (user initiated, still active until period end)
            case "subscription.canceled": {
                const subscription = event.data;
                const orgId = subscription.metadata?.organizationId as string | undefined;

                console.log(`[Polar Webhook] Subscription canceled for org: ${orgId}`);

                // Keep the plan active until expiration, just log for now
                // The plan will be downgraded when subscription.revoked fires
                if (orgId) {
                    console.log(`[Polar Webhook] Org ${orgId} subscription will end at period end`);
                }
                break;
            }

            // Subscription revoked (access should be removed immediately)
            case "subscription.revoked": {
                const subscription = event.data;
                const orgId = subscription.metadata?.organizationId as string | undefined;

                console.log(`[Polar Webhook] Subscription revoked for org: ${orgId}`);

                if (orgId) {
                    await db.update(organization).set({
                        plan: "free",
                        planExpiresAt: null,
                        polarSubscriptionId: null,
                    } as any).where(eq(organization.id, orgId));

                    console.log(`[Polar Webhook] Downgraded org ${orgId} to free plan`);
                } else {
                    // Try to find by subscription ID if org ID not in metadata
                    const subscriptionId = subscription.id;
                    if (subscriptionId) {
                        await db.update(organization).set({
                            plan: "free",
                            planExpiresAt: null,
                            polarSubscriptionId: null,
                        } as any).where(eq((organization as any).polarSubscriptionId, subscriptionId));

                        console.log(`[Polar Webhook] Downgraded org by subscription ID: ${subscriptionId}`);
                    }
                }
                break;
            }

            // Checkout completed (initial purchase)
            case "checkout.created": {
                console.log(`[Polar Webhook] Checkout created`);
                // No action needed, subscription.created will handle it
                break;
            }

            // Order completed
            case "order.created": {
                console.log(`[Polar Webhook] Order created`);
                // No action needed for subscriptions
                break;
            }

            default: {
                console.log(`[Polar Webhook] Unhandled event type: ${event.type}`);
            }
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err) {
        console.error("[Polar Webhook] Error:", err);
        return new NextResponse("Webhook verification failed", { status: 400 });
    }
}
