// Storage helpers supporting both AWS S3 and Manus Forge API
// Automatically uses AWS S3 if configured, otherwise falls back to Manus Forge API

import { ENV } from './_core/env';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type StorageConfig = { baseUrl: string; apiKey: string };

// Check if any S3-compatible storage is configured (AWS S3, Cloudflare R2, Backblaze B2)
function isS3Configured(): boolean {
  // Check for AWS S3
  if (ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsRegion && ENV.awsS3Bucket) {
    return true;
  }
  // Check for Cloudflare R2
  if (ENV.cloudflareAccountId && ENV.cloudflareAccessKeyId && ENV.cloudflareSecretAccessKey && ENV.cloudflareR2Bucket) {
    return true;
  }
  // Check for Backblaze B2
  if (ENV.backblazeKeyId && ENV.backblazeApplicationKey && ENV.backblazeBucketName) {
    return true;
  }
  return false;
}

// Get S3-compatible client (supports AWS S3, Cloudflare R2, Backblaze B2)
function getS3Client(): { client: S3Client; bucket: string; region?: string; publicUrl?: string } {
  // Cloudflare R2 (priority if configured)
  if (ENV.cloudflareAccountId && ENV.cloudflareAccessKeyId && ENV.cloudflareSecretAccessKey && ENV.cloudflareR2Bucket) {
    return {
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${ENV.cloudflareAccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: ENV.cloudflareAccessKeyId,
          secretAccessKey: ENV.cloudflareSecretAccessKey,
        },
      }),
      bucket: ENV.cloudflareR2Bucket,
      publicUrl: ENV.cloudflareR2PublicUrl,
    };
  }
  
  // Backblaze B2
  if (ENV.backblazeKeyId && ENV.backblazeApplicationKey && ENV.backblazeBucketName) {
    // Backblaze B2 uses S3-compatible API
    const endpoint = ENV.backblazeEndpoint || `https://s3.${ENV.backblazeRegion || 'us-west-004'}.backblazeb2.com`;
    return {
      client: new S3Client({
        region: ENV.backblazeRegion || 'us-west-004',
        endpoint: endpoint,
        credentials: {
          accessKeyId: ENV.backblazeKeyId,
          secretAccessKey: ENV.backblazeApplicationKey,
        },
      }),
      bucket: ENV.backblazeBucketName,
      publicUrl: ENV.backblazePublicUrl,
    };
  }
  
  // AWS S3 (fallback)
  if (ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsRegion && ENV.awsS3Bucket) {
    return {
      client: new S3Client({
        region: ENV.awsRegion,
        credentials: {
          accessKeyId: ENV.awsAccessKeyId,
          secretAccessKey: ENV.awsSecretAccessKey,
        },
      }),
      bucket: ENV.awsS3Bucket,
      region: ENV.awsRegion,
      publicUrl: ENV.awsS3PublicUrl,
    };
  }
  
  throw new Error('No S3-compatible storage configured');
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
  
  // Use S3-compatible storage if configured, otherwise use Manus Forge API
  if (isS3Configured()) {
    try {
      const { client, bucket, region, publicUrl } = getS3Client();
      const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
      
      // Determine storage type for logging
      let storageType = 'S3-compatible';
      if (ENV.cloudflareAccountId) storageType = 'Cloudflare R2';
      else if (ENV.backblazeKeyId) storageType = 'Backblaze B2';
      else if (ENV.awsAccessKeyId) storageType = 'AWS S3';
      
      console.log(`[Storage] Using ${storageType}: bucket=${bucket}`);
      
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      
      await client.send(command);
      
      // Generate public URL
      let url: string;
      if (publicUrl) {
        url = `${publicUrl}/${key}`;
      } else if (ENV.cloudflareAccountId && ENV.cloudflareR2PublicUrl) {
        url = `${ENV.cloudflareR2PublicUrl}/${key}`;
      } else if (ENV.backblazeKeyId && ENV.backblazePublicUrl) {
        url = `${ENV.backblazePublicUrl}/${key}`;
      } else if (region) {
        // AWS S3 default URL format
        url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      } else {
        // Fallback: use bucket name as domain (for R2 with custom domain)
        url = `https://${bucket}/${key}`;
      }
      
      console.log(`[Storage] ${storageType} upload successful: ${url}`);
      return { key, url };
    } catch (error) {
      console.error(`[Storage] S3-compatible upload failed:`, error);
      throw new Error(`Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Fallback to Manus Forge API
    try {
      const { baseUrl, apiKey } = getStorageConfig();
      console.log(`[Storage] Using Manus Forge API: baseUrl=${baseUrl}`);
      
      // Try Connect Protocol format first (like other Manus APIs)
      const baseUrlWithSlash = ensureTrailingSlash(baseUrl);
      const connectUrl = new URL("storage.v1.StorageService/Upload", baseUrlWithSlash).toString();
      
      console.log(`[Storage] Trying Connect Protocol: ${connectUrl}`);
      
      // Convert data to base64 for JSON payload
      const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
      const base64Data = buffer.toString('base64');
      
      const connectResponse = await fetch(connectUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "connect-protocol-version": "1",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          path: normalizeKey(key),
          data: base64Data,
          contentType: contentType,
        }),
      });
      
      if (connectResponse.ok) {
        const result = await connectResponse.json();
        const url = result.url || result.downloadUrl || `https://storage.manus.im/${key}`;
        console.log(`[Storage] Manus Forge API (Connect Protocol) upload successful: ${url}`);
        return { key, url };
      }
      
      // If Connect Protocol fails, try REST API format (legacy)
      console.log(`[Storage] Connect Protocol failed (${connectResponse.status}), trying REST API format...`);
      const uploadUrl = buildUploadUrl(baseUrl, key);
      console.log(`[Storage] Upload URL: ${uploadUrl.toString()}`);
      
      const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
      
      // Log request details for debugging
      console.log(`[Storage] Uploading to: ${uploadUrl.toString()}`);
      console.log(`[Storage] File size: ${buffer.length / 1024 / 1024}MB`);
      console.log(`[Storage] Content type: ${contentType}`);
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: buildAuthHeaders(apiKey),
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        console.error(`[Storage] Manus Forge API upload failed: ${response.status} ${response.statusText}`);
        console.error(`[Storage] Error message: ${message}`);
        console.error(`[Storage] Tried both Connect Protocol and REST API formats`);
        throw new Error(
          `Manus Forge API upload failed (${response.status} ${response.statusText}): ${message}. ` +
          `Tried both Connect Protocol (storage.v1.StorageService/Upload) and REST API (v1/storage/upload) formats. ` +
          `Please check BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY are correct, or consider using AWS S3.`
        );
      }
      const result = await response.json();
      const url = result.url;
      console.log(`[Storage] Manus Forge API (REST API) upload successful: ${url}`);
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
  
  // Use S3-compatible storage if configured, otherwise use Manus Forge API
  if (isS3Configured()) {
    try {
      const { client, bucket } = getS3Client();
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      
      // Generate signed URL (valid for 1 hour)
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      
      return { key, url };
    } catch (error) {
      throw new Error(`Storage get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Fallback to Manus Forge API
    try {
      const { baseUrl, apiKey } = getStorageConfig();
      
      // Try Connect Protocol format first
      const baseUrlWithSlash = ensureTrailingSlash(baseUrl);
      const connectUrl = new URL("storage.v1.StorageService/GetDownloadUrl", baseUrlWithSlash).toString();
      
      const connectResponse = await fetch(connectUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "connect-protocol-version": "1",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          path: normalizeKey(key),
        }),
      });
      
      if (connectResponse.ok) {
        const result = await connectResponse.json();
        const url = result.url || result.downloadUrl || `https://storage.manus.im/${key}`;
        return { key, url };
      }
      
      // Fallback to REST API format
      return {
        key,
        url: await buildDownloadUrl(baseUrl, key, apiKey),
      };
    } catch (error) {
      console.error(`[Storage] Get download URL failed:`, error);
      throw error;
    }
  }
}
