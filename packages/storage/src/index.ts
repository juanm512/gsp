/**
 * @acme/storage - S3-compatible storage abstraction
 *
 * Provides a provider-agnostic interface for file storage operations.
 * Currently configured for Cloudflare R2, but can be swapped for any
 * S3-compatible provider (AWS S3, MinIO, etc.) without changing consuming code.
 *
 * @example
 * ```typescript
 * import { storage, generateFileKey, getMimeType } from "@acme/storage";
 *
 * // Generate a presigned upload URL
 * const key = generateFileKey("uploads/videos", "my-video.mp4");
 * const { url } = await storage.getPresignedUploadUrl(key, {
 *   contentType: getMimeType("my-video.mp4"),
 * });
 *
 * // Upload directly (from server)
 * await storage.upload(key, buffer, { contentType: "video/mp4" });
 *
 * // Download
 * const { body } = await storage.download(key);
 *
 * // Check existence
 * const exists = await storage.exists(key);
 * ```
 */

// Types
export type {
    StorageClient,
    StorageConfig,
    UploadResult,
    DownloadResult,
    PresignedUrl,
    PresignedUrlOptions,
    UploadOptions,
} from "./types";

// Client
export {
    storage,
    getStorage,
    createStorageClient,
    isStorageConfigured,
} from "./client";

// Environment
export { storageEnv } from "../env";

// Utilities
export {
    generateFileKey,
    getMimeType,
    sanitizeFilename,
    validateFileSize,
    formatBytes,
    FILE_PREFIXES,
    type FilePrefix,
} from "./utils";

// Provider (for advanced use cases)
export { R2Provider } from "./providers/r2";
