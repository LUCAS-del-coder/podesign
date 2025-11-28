/**
 * 環境變數驗證
 * 在應用程式啟動時驗證所有必需的環境變數
 */

import { ENV } from "./env";

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * 驗證所有必需的環境變數
 */
export function validateEnvironmentVariables(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // 核心必需變數
  const required = {
    DATABASE_URL: ENV.databaseUrl,
    JWT_SECRET: ENV.cookieSecret,
  };

  // 檢查必需變數
  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  // 檢查 API Keys（至少需要一個 LLM 和一個轉錄服務）
  if (!ENV.googleGeminiApiKey || ENV.googleGeminiApiKey.trim() === "") {
    missing.push("GOOGLE_GEMINI_API_KEY");
  }

  if (!ENV.assemblyaiApiKey || ENV.assemblyaiApiKey.trim() === "") {
    missing.push("ASSEMBLYAI_API_KEY");
  }

  // 檢查 Storage 配置（至少需要一個）
  const hasStorage = 
    (ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsS3Bucket) ||
    (ENV.cloudflareAccountId && ENV.cloudflareAccessKeyId && ENV.cloudflareSecretAccessKey && ENV.cloudflareR2Bucket) ||
    (ENV.backblazeKeyId && ENV.backblazeApplicationKey && ENV.backblazeBucketName);

  if (!hasStorage) {
    warnings.push("未配置任何 Storage 服務（AWS S3、Cloudflare R2 或 Backblaze B2）。檔案上傳功能可能無法使用。");
  }

  // 檢查 OAuth 配置（可選，但建議配置）
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    warnings.push("未配置 Google OAuth（GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET）。Google 登入功能將無法使用。");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * 驗證並在失敗時拋出錯誤
 */
export function assertEnvironmentVariables(): void {
  const result = validateEnvironmentVariables();

  if (!result.valid) {
    throw new Error(
      `缺少必需的環境變數: ${result.missing.join(", ")}\n\n` +
      `請在 Railway 環境變數設定中配置這些變數。`
    );
  }

  // 顯示警告但不阻止啟動
  if (result.warnings.length > 0) {
    console.warn("[Env] 環境變數警告:");
    result.warnings.forEach(warning => {
      console.warn(`[Env] ⚠️  ${warning}`);
    });
  }
}

