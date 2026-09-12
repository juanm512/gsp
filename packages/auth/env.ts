import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),
      RESEND_API_KEY: z.string().min(1),
      EMAIL_TEST_MODE: z
        .enum(["true", "false"])
        .optional()
        .transform((val) => val === "true"),
      VERIFIED_EMAIL_DOMAIN: z.string().optional(),
      // Google OAuth (uncomment when ready)
      // AUTH_GOOGLE_ID: z.string().min(1).optional(),
      // AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
      NODE_ENV: z.enum(["development", "production"]).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
