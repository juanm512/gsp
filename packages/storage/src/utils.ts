import { randomUUID } from "node:crypto";
import { extname } from "node:path";

/**
 * Common MIME types mapping
 */
const MIME_TYPES: Record<string, string> = {
    // Images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",

    // Videos
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",

    // Archives
    ".zip": "application/zip",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",

    // 3D / Gaussian Splatting
    ".ply": "application/octet-stream",
    ".sog": "application/octet-stream",
    ".splat": "application/octet-stream",

    // Documents
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".txt": "text/plain",
};

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Generate a unique file key with prefix and timestamp
 * 
 * @param prefix - Directory prefix (e.g., "uploads/presentations")
 * @param filename - Original filename
 * @returns Unique key like "uploads/presentations/2026-01-13/abc123_video.mp4"
 */
export function generateFileKey(prefix: string, filename: string): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const uuid = randomUUID().slice(0, 8);
    const sanitizedFilename = sanitizeFilename(filename);

    // Clean up prefix
    const cleanPrefix = prefix.replace(/^\/|\/$/g, "");

    return `${cleanPrefix}/${date}/${uuid}_${sanitizedFilename}`;
}

/**
 * Sanitize filename to be safe for storage
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 100); // Limit length
}

/**
 * Validate file size against maximum
 * 
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @throws Error if size exceeds maximum
 */
export function validateFileSize(size: number, maxSize: number): void {
    if (size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        const actualSizeMB = (size / (1024 * 1024)).toFixed(2);
        throw new Error(
            `File size ${actualSizeMB}MB exceeds maximum allowed ${maxSizeMB}MB`
        );
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * File prefixes for different upload types
 */
export const FILE_PREFIXES = {
    /** Raw uploads from users (videos, images) */
    uploads: "uploads",
    /** Extracted video frames */
    frames: "frames",
    /** COLMAP processing data */
    colmap: "colmap",
    /** PLY files (raw and optimized) */
    ply: "ply",
    /** SOG files for final visualization */
    sog: "sog",
    /** Thumbnails */
    thumbnails: "thumbnails",
} as const;

export type FilePrefix = (typeof FILE_PREFIXES)[keyof typeof FILE_PREFIXES];
