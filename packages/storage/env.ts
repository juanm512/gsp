import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

/**
 * Storage environment configuration using t3-oss/env-core
 * 
 * Required environment variables:
 * - STORAGE_ENDPOINT: S3-compatible endpoint URL
 * - STORAGE_ACCESS_KEY_ID: Access key ID
 * - STORAGE_SECRET_ACCESS_KEY: Secret access key  
 * - STORAGE_BUCKET_NAME: Bucket name
 * - STORAGE_REGION: Region (e.g., "auto" for R2)
 */
export function storageEnv() {
    return createEnv({
        server: {
            STORAGE_ENDPOINT: z.string().url(),
            STORAGE_ACCESS_KEY_ID: z.string().min(1),
            STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
            STORAGE_BUCKET_NAME: z.string().min(1),
            STORAGE_REGION: z.string().min(1).default("auto"),
            // Optional: Public URL for direct file access
            STORAGE_PUBLIC_URL: z.string().url().optional(),
        },
        runtimeEnv: process.env,
        skipValidation:
            !!process.env.CI || process.env.npm_lifecycle_event === "lint",
    });
}

/**
 * Check if storage is properly configured (without throwing)
 */
export function isStorageConfigured(): boolean {
    try {
        storageEnv();
        return true;
    } catch {
        return false;
    }
}
