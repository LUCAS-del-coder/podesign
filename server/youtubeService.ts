/**
 * YouTube 影片處理服務
 * 使用純 JavaScript 方案（@distube/ytdl-core）下載 YouTube 音訊
 * 並使用內建的 transcribeAudio API 進行轉錄
 */

import ytdl from "@distube/ytdl-core";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

/**
 * 從 YouTube URL 提取影片 ID
 */
export function extractVideoId(url: string): string | null {
  try {
    return ytdl.getVideoID(url);
  } catch (error) {
    return null;
  }
}

/**
 * 驗證 YouTube URL 是否有效
 */
export function isValidYoutubeUrl(url: string): boolean {
  return ytdl.validateURL(url);
}

/**
 * 下載 YouTube 影片的音訊並上傳到 S3
 * @returns S3 URL 和檔案大小（MB）
 */
async function downloadYoutubeAudio(youtubeUrl: string): Promise<{
  audioUrl: string;
  fileKey: string;
  sizeMB: number;
  title?: string;
}> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error("無效的 YouTube URL");
  }

  // 建立臨時目錄
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-"));
  const outputPath = path.join(tempDir, `${videoId}.mp3`);

  try {
    console.log(`[YouTube] 開始下載音訊: ${youtubeUrl}`);

    // 獲取影片資訊
    let videoInfo;
    try {
      videoInfo = await ytdl.getInfo(youtubeUrl);
      console.log(`[YouTube] 影片標題: ${videoInfo.videoDetails.title}`);
      console.log(`[YouTube] 影片長度: ${videoInfo.videoDetails.lengthSeconds} 秒`);
    } catch (error: any) {
      console.error(`[YouTube] 獲取影片資訊失敗:`, error);
      
      // 提供友善的錯誤訊息
      let errorMessage = '無法獲取 YouTube 影片資訊';
      if (error.message?.includes('private')) {
        errorMessage = '此影片為私人影片，無法下載';
      } else if (error.message?.includes('unavailable')) {
        errorMessage = '影片不存在或不可用';
      } else if (error.message?.includes('age')) {
        errorMessage = '此影片有年齡限制，無法下載';
      } else if (error.message?.includes('region')) {
        errorMessage = '影片在您的國家/地區不可用';
      }
      throw new Error(errorMessage);
    }

    // 選擇最佳音訊格式（優先選擇 opus 或 mp4）
    const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
    if (audioFormats.length === 0) {
      throw new Error('找不到可用的音訊格式');
    }

    // 選擇最低品質的音訊格式以減小檔案大小
    const format = audioFormats.sort((a, b) => {
      const aBitrate = typeof a.bitrate === 'string' ? parseInt(a.bitrate) : (a.bitrate || 0);
      const bBitrate = typeof b.bitrate === 'string' ? parseInt(b.bitrate) : (b.bitrate || 0);
      return aBitrate - bBitrate;
    })[0];

    console.log(`[YouTube] 使用音訊格式: ${format.mimeType}, 位元率: ${format.bitrate}`);

    // 下載音訊
    const audioStream = ytdl(youtubeUrl, {
      quality: format.itag,
      filter: 'audioonly',
    });

    const writeStream = createWriteStream(outputPath);
    
    // 使用 pipeline 處理串流，並處理錯誤
    try {
      await pipeline(audioStream, writeStream);
    } catch (error: any) {
      console.error(`[YouTube] 下載失敗:`, error);
      let errorMessage = 'YouTube 影片下載失敗';
      if (error.message?.includes('timeout')) {
        errorMessage = '下載超時。影片可能過長或網路連線不穩定，請稍後重試';
      } else if (error.message?.includes('403')) {
        errorMessage = '無法下載影片。YouTube 可能已更新其保護機制，請稍後重試';
      }
      throw new Error(errorMessage);
    }

    console.log(`[YouTube] 音訊下載完成: ${outputPath}`);

    // 讀取檔案
    const audioBuffer = await fs.readFile(outputPath);
    const sizeMB = audioBuffer.length / (1024 * 1024);

    console.log(`[YouTube] 音訊檔案大小: ${sizeMB.toFixed(2)}MB`);

    // 檢查檔案大小（轉錄服務限制 16MB）
    if (sizeMB > 16) {
      throw new Error(
        `音訊檔案過大 (${sizeMB.toFixed(2)}MB)，超過 16MB 限制。` +
        `請選擇較短的影片（建議 30 分鐘以內）或使用文字輸入功能。`
      );
    }

    if (sizeMB < 0.01) {
      throw new Error(`音訊檔案過小 (${sizeMB.toFixed(2)}MB)，可能下載失敗`);
    }

    // 上傳到 S3
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const fileKey = `podcast-audio/${videoId}-${randomSuffix}.mp3`;

    console.log(`[YouTube] 上傳音訊到 S3: ${fileKey}`);
    const { url: audioUrl } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

    console.log(`[YouTube] 音訊已上傳: ${audioUrl}`);

    return {
      audioUrl,
      fileKey,
      sizeMB,
      title: videoInfo.videoDetails.title,
    };
  } catch (error) {
    console.error(`[YouTube] 處理失敗:`, error);
    // 確保錯誤訊息清晰易懂
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`YouTube 影片下載失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
  } finally {
    // 清理臨時檔案
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`[YouTube] 已清理臨時檔案: ${tempDir}`);
    } catch (error) {
      console.warn(`[YouTube] 清理臨時檔案失敗:`, error);
    }
  }
}

/**
 * 將 YouTube 影片轉錄為文字
 * 先下載音訊，再使用內建的 transcribeAudio API
 */
export async function transcribeYoutubeVideo(youtubeUrl: string): Promise<{
  text: string;
  language: string;
  duration: number;
  audioUrl: string;
  audioFileKey: string;
  title?: string;
}> {
  try {
    // 步驟 1: 下載音訊並上傳到 S3
    const { audioUrl, fileKey, sizeMB, title } = await downloadYoutubeAudio(youtubeUrl);

    console.log(`[Transcription] 開始轉錄音訊 (${sizeMB.toFixed(2)}MB): ${audioUrl}`);

    // 步驟 2: 使用內建的 transcribeAudio API
    const result = await transcribeAudio({
      audioUrl,
      language: "zh", // 預設中文，也可以讓 API 自動偵測
    });

    // 檢查是否為錯誤回應
    if ("error" in result) {
      throw new Error(result.error);
    }

    console.log(`[Transcription] 轉錄完成，文字長度: ${result.text.length} 字元`);

    return {
      text: result.text,
      language: result.language,
      duration: result.duration,
      audioUrl,
      audioFileKey: fileKey,
      title,
    };
  } catch (error) {
    console.error("[YouTube] 轉錄失敗:", error);
    throw new Error(`無法轉錄 YouTube 影片: ${error instanceof Error ? error.message : "未知錯誤"}`);
  }
}

/**
 * 使用 LLM 分析逐字稿並產生摘要與 Podcast 腳本
 */
export async function analyzePodcastContent(transcription: string): Promise<{
  summary: string;
  podcastScript: string;
}> {
  try {
    const systemPrompt = `你是一位專業的 Podcast 內容編輯。你的任務是將 YouTube 影片的逐字稿轉換為高品質的中文 Podcast 內容。

**重要：無論輸入的逐字稿是什麼語言（英文、日文、韓文等），你都必須輸出繁體中文。**

請根據提供的逐字稿完成以下任務：
1. 產生一個精華摘要（200-300字），提煉出最重要的觀點和資訊（必須使用繁體中文）
2. 將逐字稿改寫為第三人稱的 Podcast 腳本（必須使用繁體中文），包含：
   - 開場白（intro）：簡短介紹本集主題
   - 主要內容：用流暢的第三人稱敘事方式呈現核心內容
   - 結尾（outro）：總結重點並感謝收聽

請以 JSON 格式回應，包含 summary 和 podcastScript 兩個欄位。`;

    const userPrompt = `請分析以下逐字稿並產生繁體中文的摘要與 Podcast 腳本：

逐字稿：
${transcription}

請記住：必須使用繁體中文輸出所有內容。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "podcast_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "繁體中文的精華摘要，200-300字",
              },
              podcastScript: {
                type: "string",
                description: "繁體中文的第三人稱 Podcast 腳本，包含 intro、主要內容和 outro",
              },
            },
            required: ["summary", "podcastScript"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM 未返回內容");
    }

    // content 可能是 string 或 array，需要處理
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);
    return {
      summary: result.summary,
      podcastScript: result.podcastScript,
    };
  } catch (error) {
    console.error("Podcast analysis error:", error);
    throw new Error(`無法分析 Podcast 內容: ${error instanceof Error ? error.message : "未知錯誤"}`);
  }
}

/**
 * 完整的 YouTube 轉 Podcast 處理流程
 */
export async function processYoutubeToPodcast(youtubeUrl: string): Promise<{
  transcription: string;
  summary: string;
  podcastScript: string;
  language: string;
  audioUrl: string;
  audioFileKey: string;
  title?: string;
}> {
  // 驗證 URL
  if (!isValidYoutubeUrl(youtubeUrl)) {
    throw new Error("無效的 YouTube 網址");
  }

  // 步驟 1: 下載並轉錄影片
  const transcriptionResult = await transcribeYoutubeVideo(youtubeUrl);

  // 步驟 2: 分析內容並產生摘要與腳本
  const analysisResult = await analyzePodcastContent(transcriptionResult.text);

  return {
    transcription: transcriptionResult.text,
    summary: analysisResult.summary,
    podcastScript: analysisResult.podcastScript,
    language: transcriptionResult.language,
    audioUrl: transcriptionResult.audioUrl,
    audioFileKey: transcriptionResult.audioFileKey,
    title: transcriptionResult.title,
  };
}
