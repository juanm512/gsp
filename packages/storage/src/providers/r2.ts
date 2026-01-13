import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

import type {
    StorageClient,
    StorageConfig,
    UploadResult,
    DownloadResult,
    PresignedUrl,
    PresignedUrlOptions,
    UploadOptions,
} from "../types";

/**
 * Cloudflare R2 storage provider implementation
 * 
 * Uses AWS SDK v3 with R2-specific configuration.
 * Can be swapped for any other S3-compatible provider.
 */
export class R2Provider implements StorageClient {
    private client: S3Client;
    private bucket: string;
    private publicUrl?: string;

    constructor(config: StorageConfig) {
        this.client = new S3Client({
            endpoint: config.endpoint,
            region: config.region ?? "auto",
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
        this.bucket = config.bucket;
        this.publicUrl = config.publicUrl;
    }

    async upload(
        key: string,
        body: Buffer | Readable | Uint8Array,
        options?: UploadOptions
    ): Promise<UploadResult> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: options?.contentType,
            Metadata: options?.metadata,
        });

        const response = await this.client.send(command);

        return {
            key,
            etag: response.ETag,
        };
    }

    async download(key: string): Promise<DownloadResult> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        const response = await this.client.send(command);

        if (!response.Body) {
            throw new Error(`File not found: ${key}`);
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const stream = response.Body as Readable;

        for await (const chunk of stream) {
            chunks.push(chunk as Uint8Array);
        }

        return {
            body: Buffer.concat(chunks),
            contentType: response.ContentType,
            contentLength: response.ContentLength,
            etag: response.ETag,
        };
    }

    async delete(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        await this.client.send(command);
    }

    async deleteMany(keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        // S3 allows max 1000 objects per delete request
        const chunks = this.chunkArray(keys, 1000);

        for (const chunk of chunks) {
            const command = new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: chunk.map((key) => ({ Key: key })),
                },
            });

            await this.client.send(command);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.client.send(command);
            return true;
        } catch (error) {
            // NotFound error means file doesn't exist
            if ((error as { name?: string }).name === "NotFound") {
                return false;
            }
            throw error;
        }
    }

    async getPresignedUploadUrl(
        key: string,
        options?: PresignedUrlOptions
    ): Promise<PresignedUrl> {
        const expiresIn = options?.expiresIn ?? 3600;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: options?.contentType,
            ContentLength: options?.contentLength,
        });

        const url = await getSignedUrl(this.client, command, { expiresIn });

        return {
            url,
            key,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
    }

    async getPresignedDownloadUrl(
        key: string,
        options?: PresignedUrlOptions
    ): Promise<PresignedUrl> {
        const expiresIn = options?.expiresIn ?? 3600;

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        const url = await getSignedUrl(this.client, command, { expiresIn });

        return {
            url,
            key,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
    }

    getPublicUrl(key: string): string | null {
        if (!this.publicUrl) {
            return null;
        }

        // Ensure no double slashes
        const baseUrl = this.publicUrl.replace(/\/$/, "");
        const cleanKey = key.replace(/^\//, "");

        return `${baseUrl}/${cleanKey}`;
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
