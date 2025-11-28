// Storage helpers supporting both AWS S3 and Manus Forge API
// Automatically uses AWS S3 if configured, otherwise falls back to Manus Forge API

import { ENV } from './_core/env';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type StorageConfig = { baseUrl: string; apiKey: string };

// Check if AWS S3 is configured
function isS3Configured(): boolean {
  return !!(ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsRegion && ENV.awsS3Bucket);
}

// Get AWS S3 client
function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error('AWS S3 is not configured');
  }
  
  return new S3Client({
    region: ENV.awsRegion,
    credentials: {
      accessKeyId: ENV.awsAccessKeyId!,
      secretAccessKey: ENV.awsSecretAccessKey!,
    },
  });
}

// Get Manus Forge API config (legacy support)
function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  
  // Use AWS S3 if configured, otherwise use Manus Forge API
  if (isS3Configured()) {
    try {
      const s3Client = getS3Client();
      const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
      
      const command = new PutObjectCommand({
        Bucket: ENV.awsS3Bucket!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      
      await s3Client.send(command);
      
      // Generate public URL or signed URL
      const url = ENV.awsS3PublicUrl 
        ? `${ENV.awsS3PublicUrl}/${key}`
        : `https://${ENV.awsS3Bucket}.s3.${ENV.awsRegion}.amazonaws.com/${key}`;
      
      return { key, url };
    } catch (error) {
      throw new Error(`AWS S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Fallback to Manus Forge API
    const { baseUrl, apiKey } = getStorageConfig();
    const uploadUrl = buildUploadUrl(baseUrl, key);
    const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(apiKey),
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(
        `Storage upload failed (${response.status} ${response.statusText}): ${message}`
      );
    }
    const url = (await response.json()).url;
    return { key, url };
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  
  // Use AWS S3 if configured, otherwise use Manus Forge API
  if (isS3Configured()) {
    try {
      const s3Client = getS3Client();
      const command = new GetObjectCommand({
        Bucket: ENV.awsS3Bucket!,
        Key: key,
      });
      
      // Generate signed URL (valid for 1 hour)
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      return { key, url };
    } catch (error) {
      throw new Error(`AWS S3 get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Fallback to Manus Forge API
    const { baseUrl, apiKey } = getStorageConfig();
    return {
      key,
      url: await buildDownloadUrl(baseUrl, key, apiKey),
    };
  }
}
