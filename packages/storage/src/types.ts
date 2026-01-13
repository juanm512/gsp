import type { Readable } from "node:stream";

/**
 * Configuration for storage providers
 */
export interface StorageConfig {
    /** S3-compatible endpoint URL */
    endpoint: string;
    /** Access key ID */
    accessKeyId: string;
    /** Secret access key */
    secretAccessKey: string;
    /** Bucket name */
    bucket: string;
    /** Optional public URL for direct access (CDN or R2.dev) */
    publicUrl?: string;
    /** AWS region (default: auto for R2) */
    region?: string;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
    /** The key (path) where the file was stored */
    key: string;
    /** ETag of the uploaded file */
    etag?: string;
    /** Size of the uploaded file in bytes */
    size?: number;
}

/**
 * Result of a download operation
 */
export interface DownloadResult {
    /** The file content as a Buffer */
    body: Buffer;
    /** Content type of the file */
    contentType?: string;
    /** Size of the file in bytes */
    contentLength?: number;
    /** ETag of the file */
    etag?: string;
}

/**
 * Presigned URL result
 */
export interface PresignedUrl {
    /** The presigned URL */
    url: string;
    /** The key this URL is for */
    key: string;
    /** When the URL expires */
    expiresAt: Date;
}

/**
 * Options for presigned URL generation
 */
export interface PresignedUrlOptions {
    /** Time until expiration in seconds (default: 3600) */
    expiresIn?: number;
    /** Content type for upload URLs */
    contentType?: string;
    /** Content length for upload URLs */
    contentLength?: number;
}

/**
 * Options for upload operations
 */
export interface UploadOptions {
    /** Content type of the file */
    contentType?: string;
    /** Custom metadata */
    metadata?: Record<string, string>;
}

/**
 * Main storage client interface
 * 
 * This interface allows swapping between different S3-compatible providers
 * (R2, AWS S3, MinIO, etc.) without changing consuming code.
 */
export interface StorageClient {
    /**
     * Upload a file to storage
     */
    upload(
        key: string,
        body: Buffer | Readable | Uint8Array,
        options?: UploadOptions
    ): Promise<UploadResult>;

    /**
     * Download a file from storage
     */
    download(key: string): Promise<DownloadResult>;

    /**
     * Delete a file from storage
     */
    delete(key: string): Promise<void>;

    /**
     * Delete multiple files from storage
     */
    deleteMany(keys: string[]): Promise<void>;

    /**
     * Check if a file exists in storage
     */
    exists(key: string): Promise<boolean>;

    /**
     * Get a presigned URL for uploading a file
     */
    getPresignedUploadUrl(
        key: string,
        options?: PresignedUrlOptions
    ): Promise<PresignedUrl>;

    /**
     * Get a presigned URL for downloading a file
     */
    getPresignedDownloadUrl(
        key: string,
        options?: PresignedUrlOptions
    ): Promise<PresignedUrl>;

    /**
     * Get the public URL for a file (if public access is configured)
     */
    getPublicUrl(key: string): string | null;
}
