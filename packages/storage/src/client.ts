import type { StorageClient, StorageConfig } from "./types";
import { storageEnv, isStorageConfigured } from "../env";
import { R2Provider } from "./providers/r2";

/**
 * Get storage configuration from environment
 */
function getStorageConfig(): StorageConfig {
    const env = storageEnv();
    return {
        endpoint: env.STORAGE_ENDPOINT,
        accessKeyId: env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
        bucket: env.STORAGE_BUCKET_NAME,
        region: env.STORAGE_REGION,
        publicUrl: env.STORAGE_PUBLIC_URL,
    };
}

/**
 * Create a storage client with the given configuration
 * 
 * @param config - Override configuration (defaults to env vars)
 * @returns Configured StorageClient
 */
export function createStorageClient(
    config?: Partial<StorageConfig>
): StorageClient {
    const finalConfig = config
        ? { ...getStorageConfig(), ...config }
        : getStorageConfig();

    // Currently using R2, but this can be swapped for any S3-compatible provider
    return new R2Provider(finalConfig);
}

// Lazy-initialized singleton storage client
let _storageInstance: StorageClient | null = null;

/**
 * Get the default storage client singleton
 * 
 * Lazy-initialized to avoid errors if env vars aren't set during import.
 * Throws an error if storage is not configured.
 */
export function getStorage(): StorageClient {
    if (!_storageInstance) {
        _storageInstance = createStorageClient();
    }
    return _storageInstance;
}

/**
 * Storage client for direct access
 * 
 * @example
 * ```typescript
 * import { storage } from "@acme/storage";
 * 
 * const url = await storage.getPresignedUploadUrl("my-file.mp4");
 * ```
 */
export const storage = {
    get instance(): StorageClient {
        return getStorage();
    },

    upload: (...args: Parameters<StorageClient["upload"]>) =>
        getStorage().upload(...args),

    download: (...args: Parameters<StorageClient["download"]>) =>
        getStorage().download(...args),

    delete: (...args: Parameters<StorageClient["delete"]>) =>
        getStorage().delete(...args),

    deleteMany: (...args: Parameters<StorageClient["deleteMany"]>) =>
        getStorage().deleteMany(...args),

    exists: (...args: Parameters<StorageClient["exists"]>) =>
        getStorage().exists(...args),

    getPresignedUploadUrl: (
        ...args: Parameters<StorageClient["getPresignedUploadUrl"]>
    ) => getStorage().getPresignedUploadUrl(...args),

    getPresignedDownloadUrl: (
        ...args: Parameters<StorageClient["getPresignedDownloadUrl"]>
    ) => getStorage().getPresignedDownloadUrl(...args),

    getPublicUrl: (...args: Parameters<StorageClient["getPublicUrl"]>) =>
        getStorage().getPublicUrl(...args),
};

export { isStorageConfigured };
