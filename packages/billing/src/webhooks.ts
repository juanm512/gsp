
import { WebhookVerificationError, validateEvent } from "@polar-sh/sdk/webhooks";

export async function handleWebhook(
    payload: string,
    headers: Record<string, string>,
    secret: string
) {
    // Validate signature
    const webhookEvent = validateEvent(payload, headers, secret);

    return webhookEvent;
}
