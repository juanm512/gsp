import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

// Export directly for singleton usage
export const env = createEnv({
    server: {
        POLAR_ACCESS_TOKEN: z.string().min(1),
        POLAR_WEBHOOK_SECRET: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    },
    clientPrefix: "NEXT_PUBLIC_",
    client: {},
    runtimeEnv: process.env,
    skipValidation:
        !!process.env.SKIP_ENV_VALIDATION ||
        !!process.env.CI ||
        process.env.npm_lifecycle_event === "lint",
});
