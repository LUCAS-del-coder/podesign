import { storagePut } from './storage';
import crypto from 'crypto';

/**
 * 上傳圖片到 S3
 * @param base64Data Base64 編碼的圖片資料（包含 data:image/... 前綴）
 * @param userId 使用者 ID
 * @returns 圖片的 S3 URL
 */
export async function uploadAvatarImage(base64Data: string, userId: number): Promise<string> {
  // 解析 base64 資料
  const matches = base64Data.match(/^data:image\/(png|jpg|jpeg);base64,(.+)$/);
  if (!matches) {
    throw new Error('無效的圖片格式，僅支援 PNG、JPG、JPEG');
  }

  const [, extension, base64Content] = matches;
  const buffer = Buffer.from(base64Content, 'base64');

  // 檢查檔案大小（最大 10MB）
  const maxSize = 10 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error('圖片檔案過大，最大支援 10MB');
  }

  // 生成唯一的檔案名稱
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const fileKey = `avatars/${userId}/${Date.now()}-${randomSuffix}.${extension}`;

  // 上傳到 S3
  const contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  const result = await storagePut(fileKey, buffer, contentType);

  return result.url;
}

/**
 * 驗證圖片 URL 是否有效
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') ?? false;
  } catch {
    return false;
  }
}
