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
    const missingVars = [];
    if (!baseUrl) missingVars.push('BUILT_IN_FORGE_API_URL');
    if (!apiKey) missingVars.push('BUILT_IN_FORGE_API_KEY');
    
    throw new Error(
      `Storage proxy credentials missing: ${missingVars.join(', ')}. ` +
      `Either configure AWS S3 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET) ` +
      `or Manus Forge API (BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY)`
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  // Manus Forge API endpoint format
  // Try different possible endpoint formats
  const baseUrlWithSlash = ensureTrailingSlash(baseUrl);
  
  // Option 1: REST API format (v1/storage/upload)
  const url = new URL("v1/storage/upload", baseUrlWithSlash);
  url.searchParams.set("path", normalizeKey(relKey));
  
  // Log the URL for debugging
  console.log(`[Storage] Building upload URL: ${url.toString()}`);
  
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
      console.log(`[Storage] Using AWS S3: bucket=${ENV.awsS3Bucket}, region=${ENV.awsRegion}`);
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
      
      console.log(`[Storage] AWS S3 upload successful: ${url}`);
      return { key, url };
    } catch (error) {
      console.error(`[Storage] AWS S3 upload failed:`, error);
      throw new Error(`AWS S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Fallback to Manus Forge API
    try {
      const { baseUrl, apiKey } = getStorageConfig();
      console.log(`[Storage] Using Manus Forge API: baseUrl=${baseUrl}`);
      const uploadUrl = buildUploadUrl(baseUrl, key);
      console.log(`[Storage] Upload URL: ${uploadUrl.toString()}`);
      
      const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
      
      // Log request details for debugging
      console.log(`[Storage] Uploading to: ${uploadUrl.toString()}`);
      console.log(`[Storage] File size: ${(typeof data === 'string' ? Buffer.from(data).length : data.length) / 1024 / 1024}MB`);
      console.log(`[Storage] Content type: ${contentType}`);
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(apiKey),
          // Some APIs require explicit content-type for form-data
          // Note: Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        console.error(`[Storage] Manus Forge API upload failed: ${response.status} ${response.statusText}`);
        console.error(`[Storage] Error message: ${message}`);
        throw new Error(
          `Manus Forge API upload failed (${response.status} ${response.statusText}): ${message}. ` +
          `Please check BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY are correct.`
        );
      }
      const result = await response.json();
      const url = result.url;
      console.log(`[Storage] Manus Forge API upload successful: ${url}`);
      return { key, url };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Storage proxy credentials missing')) {
        throw error;
      }
      console.error(`[Storage] Upload failed:`, error);
      throw error;
    }
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
