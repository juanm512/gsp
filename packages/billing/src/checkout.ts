import { polar } from "./polar";

export async function createCheckout({
    productId,
    successUrl,
    organizationId,
    customerEmail,
}: {
    productId: string;
    successUrl: string;
    organizationId: string;
    customerEmail?: string;
}) {
    const result = await polar.checkouts.create({
        products: [productId],
        successUrl,
        metadata: {
            organizationId,
        },
        customerEmail,
    });

    return result;
}
