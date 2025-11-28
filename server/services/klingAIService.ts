import jwt from 'jsonwebtoken';
import { ENV } from '../_core/env';

/**
 * Kling AI API 客戶端服務
 * 用於生成虛擬主播影片（Avatar）
 */

const KLING_AI_API_BASE = 'https://api-singapore.klingai.com';
const KLING_AI_ACCESS_KEY = process.env.KLING_AI_ACCESS_KEY || '';
const KLING_AI_SECRET_KEY = process.env.KLING_AI_SECRET_KEY || '';

/**
 * 生成 Kling AI JWT Token
 */
function generateKlingAIToken(): string {
  if (!KLING_AI_ACCESS_KEY || !KLING_AI_SECRET_KEY) {
    throw new Error('Kling AI API credentials not configured');
  }

  const payload = {
    iss: KLING_AI_ACCESS_KEY,
    exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 分鐘過期
    nbf: Math.floor(Date.now() / 1000) - 5, // 5 秒前開始生效
  };

  return jwt.sign(payload, KLING_AI_SECRET_KEY, { algorithm: 'HS256' });
}

/**
 * Kling AI API 請求輔助函數
 */
async function klingAIRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<T> {
  const token = generateKlingAIToken();
  const url = `${KLING_AI_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  console.log(`[KlingAI] ${method} ${url}`);

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok || data.code !== 0) {
    console.error('[KlingAI] API Error:', data);
    throw new Error(data.message || 'Kling AI API request failed');
  }

  return data;
}

/**
 * Avatar 影片生成參數
 */
export interface AvatarVideoParams {
  /** 虛擬主播參考圖片（URL 或 Base64） */
  image: string;
  /** 音訊檔案 URL */
  soundFileUrl: string;
  /** 正向文字提示（可選） */
  prompt?: string;
  /** 影片生成模式：std（標準）或 pro（專業） */
  mode?: 'std' | 'pro';
  /** 回調 URL（可選） */
  callbackUrl?: string;
  /** 自訂任務 ID（可選） */
  externalTaskId?: string;
}

/**
 * Avatar 任務回應
 */
export interface AvatarTaskResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_info: {
      external_task_id?: string;
    };
    created_at: number;
    updated_at: number;
  };
}

/**
 * Avatar 任務查詢回應
 */
export interface AvatarTaskQueryResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_status_msg?: string;
    task_info: {
      external_task_id?: string;
    };
    created_at: number;
    updated_at: number;
    task_result?: {
      videos: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
    };
  };
}

/**
 * 創建 Avatar 影片生成任務
 */
export async function createAvatarVideo(params: AvatarVideoParams): Promise<AvatarTaskResponse> {
  const body = {
    image: params.image,
    sound_file: params.soundFileUrl,
    prompt: params.prompt,
    mode: params.mode || 'std',
    callback_url: params.callbackUrl,
    external_task_id: params.externalTaskId,
  };

  return klingAIRequest<AvatarTaskResponse>(
    '/v1/videos/avatar/image2video',
    'POST',
    body
  );
}

/**
 * 查詢 Avatar 影片任務狀態
 */
export async function queryAvatarTask(taskId: string): Promise<AvatarTaskQueryResponse> {
  return klingAIRequest<AvatarTaskQueryResponse>(
    `/v1/videos/avatar/image2video/${taskId}`,
    'GET'
  );
}

/**
 * 輪詢 Avatar 任務直到完成
 * @param taskId 任務 ID
 * @param maxAttempts 最大嘗試次數（預設 60 次）
 * @param intervalMs 輪詢間隔（預設 10 秒）
 */
export async function pollAvatarTask(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<AvatarTaskQueryResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await queryAvatarTask(taskId);

    if (result.data.task_status === 'succeed') {
      console.log(`[KlingAI] Task ${taskId} succeeded`);
      return result;
    }

    if (result.data.task_status === 'failed') {
      console.error(`[KlingAI] Task ${taskId} failed:`, result.data.task_status_msg);
      throw new Error(result.data.task_status_msg || 'Avatar video generation failed');
    }

    console.log(`[KlingAI] Task ${taskId} status: ${result.data.task_status}, attempt ${attempt + 1}/${maxAttempts}`);

    // 等待後再次查詢
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Avatar video generation timeout after ${maxAttempts} attempts`);
}
