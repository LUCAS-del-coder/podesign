/**
 * 統一錯誤處理機制
 * 提供結構化的錯誤類型和處理函數
 */

export enum ErrorCode {
  // 驗證錯誤
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  
  // 外部服務錯誤
  YOUTUBE_DOWNLOAD_FAILED = "YOUTUBE_DOWNLOAD_FAILED",
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  LLM_INVOKE_FAILED = "LLM_INVOKE_FAILED",
  STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED",
  PODCAST_GENERATION_FAILED = "PODCAST_GENERATION_FAILED",
  
  // 配置錯誤
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  API_KEY_MISSING = "API_KEY_MISSING",
  
  // 資料庫錯誤
  DATABASE_ERROR = "DATABASE_ERROR",
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  
  // 系統錯誤
  INTERNAL_ERROR = "INTERNAL_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
    public originalError?: Error
  ) {
    super(message);
    this.name = "AppError";
    
    // 保留原始錯誤堆疊
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * 將未知錯誤轉換為 AppError
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    // 嘗試從錯誤訊息推斷錯誤類型
    const message = error.message.toLowerCase();
    
    if (message.includes("youtube") || message.includes("yt-dlp")) {
      return new AppError(
        ErrorCode.YOUTUBE_DOWNLOAD_FAILED,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes("transcription") || message.includes("assemblyai")) {
      return new AppError(
        ErrorCode.TRANSCRIPTION_FAILED,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes("llm") || message.includes("gemini")) {
      return new AppError(
        ErrorCode.LLM_INVOKE_FAILED,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes("storage") || message.includes("s3") || message.includes("upload")) {
      return new AppError(
        ErrorCode.STORAGE_UPLOAD_FAILED,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes("database") || message.includes("db")) {
      return new AppError(
        ErrorCode.DATABASE_ERROR,
        error.message,
        undefined,
        error
      );
    }
    
    // 預設為內部錯誤
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      error.message,
      undefined,
      error
    );
  }
  
  // 非 Error 物件
  return new AppError(
    ErrorCode.INTERNAL_ERROR,
    String(error),
    { originalValue: error }
  );
}

/**
 * 記錄錯誤（結構化日誌）
 */
export function logError(error: AppError, context?: Record<string, unknown>): void {
  const logData = {
    code: error.code,
    message: error.message,
    details: error.details,
    context,
    stack: error.stack,
    originalError: error.originalError?.message,
  };
  
  console.error(`[Error] ${error.code}:`, JSON.stringify(logData, null, 2));
}

/**
 * 將 AppError 轉換為用戶友好的錯誤訊息
 */
export function getUserFriendlyMessage(error: AppError): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.INVALID_INPUT]: "輸入資料無效",
    [ErrorCode.MISSING_REQUIRED_FIELD]: "缺少必要欄位",
    [ErrorCode.YOUTUBE_DOWNLOAD_FAILED]: "無法下載 YouTube 影片",
    [ErrorCode.TRANSCRIPTION_FAILED]: "語音轉錄失敗",
    [ErrorCode.LLM_INVOKE_FAILED]: "AI 分析失敗",
    [ErrorCode.STORAGE_UPLOAD_FAILED]: "檔案上傳失敗",
    [ErrorCode.PODCAST_GENERATION_FAILED]: "Podcast 生成失敗",
    [ErrorCode.CONFIGURATION_ERROR]: "系統配置錯誤",
    [ErrorCode.API_KEY_MISSING]: "API 金鑰未設定",
    [ErrorCode.DATABASE_ERROR]: "資料庫錯誤",
    [ErrorCode.RECORD_NOT_FOUND]: "找不到記錄",
    [ErrorCode.INTERNAL_ERROR]: "系統內部錯誤",
    [ErrorCode.TIMEOUT_ERROR]: "請求超時",
  };
  
  return messages[error.code] || error.message;
}

