/**
 * YouTube 影片資訊服務
 * 使用 @distube/ytdl-core 獲取 YouTube 影片的基本資訊
 */

import ytdl from "@distube/ytdl-core";
import { isValidYoutubeUrl } from "../youtubeService";

export interface YoutubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  duration: number; // 秒
  thumbnail: string;
  author: string;
  viewCount: number;
  publishDate: string;
}

/**
 * 獲取 YouTube 影片資訊
 */
export async function getYoutubeVideoInfo(
  youtubeUrl: string
): Promise<YoutubeVideoInfo> {
  if (!isValidYoutubeUrl(youtubeUrl)) {
    throw new Error("無效的 YouTube URL");
  }

  try {
    const videoInfo = await ytdl.getInfo(youtubeUrl);
    const details = videoInfo.videoDetails;

    return {
      videoId: details.videoId,
      title: details.title,
      description: details.description || "",
      duration: parseInt(details.lengthSeconds || "0", 10),
      thumbnail:
        details.thumbnails?.[details.thumbnails.length - 1]?.url || "",
      author: details.author?.name || "",
      viewCount: parseInt(details.viewCount || "0", 10),
      publishDate: details.publishDate || "",
    };
  } catch (error: any) {
    console.error(`[VideoInfoService] 獲取影片資訊失敗:`, error);

    // 提供友善的錯誤訊息
    let errorMessage = "無法獲取 YouTube 影片資訊";
    if (error.message?.includes("private")) {
      errorMessage = "此影片為私人影片，無法查看";
    } else if (error.message?.includes("unavailable")) {
      errorMessage = "影片不存在或不可用";
    } else if (error.message?.includes("age")) {
      errorMessage = "此影片有年齡限制，無法查看";
    } else if (error.message?.includes("region")) {
      errorMessage = "影片在您的國家/地區不可用";
    }

    throw new Error(errorMessage);
  }
}

