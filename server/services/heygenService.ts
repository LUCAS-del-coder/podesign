/**
 * HeyGen API 客戶端服務
 * 用於生成虛擬主播影片（Avatar Video）
 * 
 * 文件: https://docs.heygen.com/docs/create-video
 * API Reference: https://docs.heygen.com/reference/create-an-avatar-video-v2
 */

const HEYGEN_API_BASE = 'https://api.heygen.com';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

/**
 * HeyGen API 請求輔助函數
 */
async function heygenRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<T> {
  if (!HEYGEN_API_KEY) {
    throw new Error('HeyGen API key not configured');
  }

  const url = `${HEYGEN_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Key': HEYGEN_API_KEY,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  console.log(`[HeyGen] ${method} ${url}`);

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('[HeyGen] API Error:', data);
    throw new Error(data.message || data.error || 'HeyGen API request failed');
  }

  return data;
}

/**
 * Avatar 列表項目
 */
export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
  preview_video_url?: string;
}

/**
 * Voice 列表項目
 */
export interface HeyGenVoice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio?: string;
}

/**
 * Avatar 影片生成參數
 */
export interface AvatarVideoParams {
  /** 音訊檔案 URL */
  audioUrl: string;
  /** Avatar ID（可選，使用預設 Avatar） */
  avatarId?: string;
  /** 影片寬度（預設 1280） */
  width?: number;
  /** 影片高度（預設 720） */
  height?: number;
  /** 測試模式（不消耗額度，但有浮水印） */
  test?: boolean;
}

/**
 * 影片生成回應
 */
export interface VideoGenerateResponse {
  code: number;
  data: {
    video_id: string;
  };
  message?: string;
}

/**
 * 影片狀態回應
 */
export interface VideoStatusResponse {
  code: number;
  data: {
    video_id: string;
    status: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed';
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: {
      code: string;
      message: string;
      detail: string;
    };
  };
  message?: string;
}

/**
 * 獲取 Avatar 列表
 */
export async function listAvatars(): Promise<HeyGenAvatar[]> {
  const response = await heygenRequest<{ data: { avatars: HeyGenAvatar[] } }>(
    '/v2/avatars',
    'GET'
  );
  return response.data.avatars;
}

/**
 * 獲取 Voice 列表
 */
export async function listVoices(): Promise<HeyGenVoice[]> {
  const response = await heygenRequest<{ data: { voices: HeyGenVoice[] } }>(
    '/v2/voices',
    'GET'
  );
  return response.data.voices;
}

/**
 * 創建 Avatar 影片（使用音訊檔案）
 * 
 * 注意：
 * - 音訊檔案必須是可公開訪問的 URL
 * - 支援的格式：MP3, WAV, M4A 等
 * - 音訊長度建議在 60 秒以內
 */
export async function createAvatarVideo(params: AvatarVideoParams): Promise<VideoGenerateResponse> {
  // 使用預設的 Avatar（可以從 listAvatars() 獲取）
  // 這裡使用一個通用的 Avatar ID，實際使用時應該從列表中選擇
  const avatarId = params.avatarId || 'Kristin_public_3_20240108';

  const body = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal',
        },
        voice: {
          type: 'audio',
          audio_url: params.audioUrl,
        },
      },
    ],
    dimension: {
      width: params.width || 1280,
      height: params.height || 720,
    },
    test: params.test || false,
  };

  return heygenRequest<VideoGenerateResponse>(
    '/v2/video/generate',
    'POST',
    body
  );
}

/**
 * 查詢影片生成狀態
 */
export async function getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
  return heygenRequest<VideoStatusResponse>(
    `/v1/video_status.get?video_id=${videoId}`,
    'GET'
  );
}

/**
 * 輪詢影片任務直到完成
 * @param videoId 影片 ID
 * @param maxAttempts 最大嘗試次數（預設 60 次）
 * @param intervalMs 輪詢間隔（預設 10 秒）
 */
export async function pollVideoStatus(
  videoId: string,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<VideoStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getVideoStatus(videoId);

    if (result.data.status === 'completed') {
      console.log(`[HeyGen] Video ${videoId} completed`);
      return result;
    }

    if (result.data.status === 'failed') {
      const errorMsg = result.data.error?.message || 'Video generation failed';
      console.error(`[HeyGen] Video ${videoId} failed:`, errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`[HeyGen] Video ${videoId} status: ${result.data.status}, attempt ${attempt + 1}/${maxAttempts}`);

    // 等待後再次查詢
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Video generation timeout after ${maxAttempts} attempts`);
}
