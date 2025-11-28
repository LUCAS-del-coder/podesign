/**
 * YouTube 影片處理服務
 * 直接使用 yt-dlp 二進位檔下載 YouTube 音訊（更可靠的方式）
 * 並使用內建的 transcribeAudio API 進行轉錄
 */

import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError, ErrorCode, normalizeError, logError } from "./_core/errorHandler";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * 從 YouTube URL 提取影片 ID
 */
export function extractVideoId(url: string): string | null {
  try {
    // 支援多種 YouTube URL 格式
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 驗證 YouTube URL 是否有效
 */
export function isValidYoutubeUrl(url: string): boolean {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
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
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "無效的 YouTube URL",
      { url: youtubeUrl }
    );
  }

  // 建立臨時目錄
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-"));
  const outputPath = path.join(tempDir, `${videoId}.mp3`);

  try {
    console.log(`[YouTube] 開始下載音訊: ${youtubeUrl}`);

    // 直接使用 yt-dlp 二進位檔下載音訊（更可靠的方式）
    try {
      console.log(`[YouTube] 使用 yt-dlp 下載音訊...`);
      
      // 先獲取影片資訊
      let videoInfo: any = {};
      let title = 'Unknown';
      let duration = 0;
      
      try {
        console.log(`[YouTube] 獲取影片資訊...`);
        const { stdout: infoStdout } = await execFileAsync('yt-dlp', [
          '--dump-json',
          '--no-warnings',
          '--no-call-home',
          '--no-check-certificate',
          youtubeUrl,
        ], { maxBuffer: 1024 * 1024 * 10 });
        
        try {
          videoInfo = JSON.parse(infoStdout);
          title = videoInfo.title || 'Unknown';
          duration = videoInfo.duration || 0;
        } catch (parseError) {
          console.warn(`[YouTube] JSON 解析失敗:`, parseError);
        }
      } catch (error: any) {
        console.warn(`[YouTube] 獲取影片資訊失敗，繼續下載:`, error.message || error);
        // 繼續下載，即使獲取資訊失敗
      }

      console.log(`[YouTube] 影片標題: ${title}`);
      console.log(`[YouTube] 影片長度: ${duration} 秒`);

      // 下載音訊並直接轉換為 MP3（使用 --extract-audio --audio-format mp3）
      console.log(`[YouTube] 開始下載音訊...`);
      const outputPath = path.join(tempDir, `${videoId}.mp3`);
      
      console.log(`[YouTube] 輸出路徑: ${outputPath}`);
      console.log(`[YouTube] 臨時目錄: ${tempDir}`);
      
      try {
        // 使用 yt-dlp 直接提取音訊並轉換為 MP3
        // 這是更可靠的方式，避免格式轉換問題
        console.log(`[YouTube] 執行 yt-dlp 下載命令...`);
        const { stdout, stderr } = await execFileAsync('yt-dlp', [
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '0', // 最佳品質
          '--output', outputPath,
          '--no-warnings',
          '--no-call-home',
          '--no-check-certificate',
          youtubeUrl,
        ], { 
          maxBuffer: 1024 * 1024 * 50, // 50MB buffer for large outputs
          timeout: 600000, // 10 分鐘超時
        });
        
        console.log(`[YouTube] yt-dlp 執行完成`);
        if (stdout) console.log(`[YouTube] yt-dlp stdout:`, stdout.substring(0, 500));
        if (stderr) console.log(`[YouTube] yt-dlp stderr:`, stderr.substring(0, 500));
      } catch (downloadError: any) {
        // 詳細記錄錯誤資訊
        console.error(`[YouTube] yt-dlp 下載錯誤:`, downloadError.message || downloadError);
        console.error(`[YouTube] 錯誤類型:`, downloadError.constructor?.name);
        if (downloadError.stdout) {
          console.error(`[YouTube] yt-dlp stdout:`, downloadError.stdout);
        }
        if (downloadError.stderr) {
          console.error(`[YouTube] yt-dlp stderr:`, downloadError.stderr);
        }
        
        // 檢查是否實際上下載了檔案（即使有錯誤）
        const filesAfterError = await fs.readdir(tempDir);
        console.log(`[YouTube] 錯誤後目錄中的檔案:`, filesAfterError);
        
        // 如果錯誤但檔案存在，繼續處理
        if (filesAfterError.length === 0) {
          // 如果完全沒有檔案，檢查是否是特定錯誤
          const errorMessage = downloadError.message || '';
          const errorStderr = downloadError.stderr || '';
          
          if (errorMessage.includes('403') || errorStderr.includes('403')) {
            throw new Error('YouTube 暫時限制存取（403），請稍後重試或嘗試其他影片');
          }
          if (errorMessage.includes('yt-dlp') || errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
            throw new Error('yt-dlp 無法執行。請檢查 Railway 環境是否正確安裝了 yt-dlp');
          }
          
          // 提供更詳細的錯誤訊息
          throw new Error(`YouTube 下載失敗: ${errorMessage || '未知錯誤'}`);
        }
      }

      // 等待一下確保檔案寫入完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 檢查下載的 MP3 檔案是否存在
      console.log(`[YouTube] 檢查下載的檔案: ${outputPath}`);
      
      try {
        const stats = await fs.stat(outputPath);
        console.log(`[YouTube] 檔案大小: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
        
        // 檢查檔案大小是否合理（至少 1KB）
        if (stats.size < 1024) {
          throw new Error('下載的檔案太小，可能下載失敗');
        }
      } catch (error: any) {
        // 如果檔案不存在，檢查目錄中是否有其他檔案
        const files = await fs.readdir(tempDir);
        console.error(`[YouTube] 找不到 MP3 檔案。目錄內容:`, files);
        
        // 嘗試查找任何音訊檔案
        const audioFile = files.find(f => 
          (f.endsWith('.m4a') || f.endsWith('.webm') || f.endsWith('.opus') || f.endsWith('.mp3') || f.endsWith('.ogg')) &&
          !f.endsWith('.part') &&
          !f.endsWith('.ytdl')
        );
        
        if (audioFile) {
          console.log(`[YouTube] 找到其他格式的音訊檔案: ${audioFile}，嘗試轉換...`);
          const downloadedPath = path.join(tempDir, audioFile);
          const ffmpegPath = (await import('@ffmpeg-installer/ffmpeg')).default.path;
          
          try {
            await execFileAsync(ffmpegPath, [
              '-i', downloadedPath,
              '-acodec', 'libmp3lame',
              '-b:a', '128k',
              outputPath,
              '-y'
            ], { maxBuffer: 1024 * 1024 * 10 });
            
            console.log(`[YouTube] 音訊轉換完成: ${outputPath}`);
            await fs.unlink(downloadedPath);
          } catch (convertError: any) {
            throw new Error(`音訊格式轉換失敗: ${convertError.message}`);
          }
        } else {
          throw new Error(`下載的檔案不存在: ${outputPath}`);
        }
    }

    console.log(`[YouTube] 音訊下載完成: ${outputPath}`);

    // 讀取檔案
    const audioBuffer = await fs.readFile(outputPath);
    const sizeMB = audioBuffer.length / (1024 * 1024);

    console.log(`[YouTube] 音訊檔案大小: ${sizeMB.toFixed(2)}MB`);

      // 檢查檔案大小（AssemblyAI 支援更大的檔案，提高限制到 50MB）
      // 注意：更大的檔案可能需要更長的處理時間
      const MAX_FILE_SIZE_MB = 50;
      if (sizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(
          `音訊檔案過大 (${sizeMB.toFixed(2)}MB)，超過 ${MAX_FILE_SIZE_MB}MB 限制。` +
          `請選擇較短的影片（建議 80 分鐘以內）或使用文字輸入功能。`
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
        title: title,
      };
    } catch (error: any) {
      console.error(`[YouTube] 處理失敗:`, error);
      
      // 檢查是否是 storage 相關錯誤（不應該被誤判為 YouTube 下載錯誤）
      if (error.message?.includes('Storage') || error.message?.includes('storage') || error.message?.includes('BUILT_IN_FORGE')) {
        throw new Error(`檔案上傳失敗：${error.message}。請檢查 Storage 配置（BUILT_IN_FORGE_API_URL 和 BUILT_IN_FORGE_API_KEY）`);
      }
      
      // 提供友善的錯誤訊息（僅針對 YouTube 下載相關錯誤）
      let errorMessage = 'YouTube 影片下載失敗';
      const errorMsg = error.message || '';
      const errorStderr = error.stderr || '';
      
      if (errorMsg.includes('Private video') || errorStderr.includes('Private video')) {
        errorMessage = '此影片為私人影片，無法下載';
      } else if (errorMsg.includes('unavailable') || errorStderr.includes('unavailable')) {
        errorMessage = '影片不存在或不可用';
      } else if ((errorMsg.includes('age') || errorStderr.includes('age')) && 
                 !errorMsg.includes('Storage') && !errorMsg.includes('storage')) {
        // 只有在不是 storage 錯誤時才判斷為年齡限制
        errorMessage = '此影片有年齡限制，無法下載';
      } else if (errorMsg.includes('region') || errorStderr.includes('region')) {
        errorMessage = '影片在您的國家/地區不可用';
      } else if (errorMsg.includes('403') || errorStderr.includes('403')) {
        errorMessage = 'YouTube 暫時限制存取，請稍後重試';
      } else if (errorMsg.includes('timeout')) {
        errorMessage = '下載超時。影片可能過長或網路連線不穩定，請稍後重試';
      }
      
      throw new Error(errorMessage);
    }
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
      const errorDetails = result.details ? `: ${result.details}` : '';
      console.error(`[YouTube] 轉錄錯誤: ${result.error}${errorDetails}`);
      throw new Error(`${result.error}${errorDetails}`);
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
    // 簡化提示詞以提高處理速度
    const systemPrompt = `你是專業的 Podcast 編輯。將逐字稿轉為繁體中文 Podcast 內容。

輸出 JSON：{"summary": "200-300字摘要", "podcastScript": "第三人稱腳本（含 intro、主要內容、outro）"}`;

    // 如果逐字稿太長，只取前 8000 字元以加快處理
    const maxLength = 8000;
    const truncatedTranscription = transcription.length > maxLength 
      ? transcription.substring(0, maxLength) + "...（內容已截斷）"
      : transcription;

    const userPrompt = `分析以下逐字稿，輸出繁體中文 JSON：

${truncatedTranscription}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // 使用 json_object 格式（OpenAI 支援，更快）
      response_format: {
        type: "json_object",
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM 未返回內容");
    }

    // content 可能是 string 或 array，需要處理
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    
    // 嘗試解析 JSON
    let result;
    try {
      result = JSON.parse(contentStr);
    } catch (parseError) {
      // 如果解析失敗，嘗試提取 JSON 部分
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("無法解析 LLM 回應為 JSON");
      }
    }
    
    // 驗證結果格式
    if (!result.summary || !result.podcastScript) {
      throw new Error("LLM 回應格式不正確，缺少 summary 或 podcastScript");
    }
    
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
 * 使用 Gemini 直接分析 YouTube URL（快速方式，跳過下載和轉錄）
 * 使用官方 SDK，與 llm.ts 保持一致
 */
async function analyzeYoutubeUrlDirectly(youtubeUrl: string): Promise<{
  transcription: string;
  summary: string;
  podcastScript: string;
  language: string;
  title?: string;
}> {
  console.log(`[YouTube] 使用 Gemini 直接分析 YouTube URL: ${youtubeUrl}`);
  
  const { ENV } = await import("./_core/env");
  
  if (!ENV.googleGeminiApiKey) {
    throw new AppError(
      ErrorCode.API_KEY_MISSING,
      "GOOGLE_GEMINI_API_KEY is not configured"
    );
  }

  const systemPrompt = `你是專業的 Podcast 編輯。分析 YouTube 影片並生成繁體中文 Podcast 內容。

輸出 JSON 格式：
{
  "title": "影片標題",
  "transcription": "主要內容的文字摘要（500-1000字）",
  "summary": "200-300字精華摘要",
  "podcastScript": "第三人稱 Podcast 腳本（含 intro、主要內容、outro）"
}`;

  const userPrompt = `請分析這個 YouTube 影片並生成繁體中文 Podcast 內容。影片網址：${youtubeUrl}\n\n請直接觀看影片內容並以 JSON 格式回應。`;

  // 使用官方 SDK，與 llm.ts 保持一致
  const client = new GoogleGenerativeAI(ENV.googleGeminiApiKey);
  
  // 嘗試多個模型（與 llm.ts 使用相同的模型列表）
  // 優先使用穩定版本，實驗版本可能不在免費層
  const modelNames = [
    "gemini-2.0-flash", // 穩定版本，優先使用
    "gemini-1.5-pro-latest", // Fallback
    "gemini-2.0-flash-exp", // 實驗版本，最後嘗試（可能不在免費層）
  ];
  
  let lastError: Error | null = null;
  
  for (const modelName of modelNames) {
    try {
      console.log(`[YouTube] Trying Gemini model: ${modelName}`);
      
      const model = client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });
      
      // 組合提示詞
      const prompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const response = await model.generateContent(prompt);
      const responseText = response.response.text();
      
      if (!responseText) {
        throw new Error("Gemini 未返回內容");
      }

      // 解析 JSON 回應（清理控制字符）
      let result;
      try {
        // 清理控制字符（換行符、製表符等，但保留 JSON 結構）
        const cleanedText = responseText
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 移除控制字符
          .replace(/\n/g, ' ') // 將換行符替換為空格
          .replace(/\r/g, '') // 移除回車符
          .trim();
        
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        // 如果解析失敗，嘗試提取 JSON 部分
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const cleanedJson = jsonMatch[0]
              .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
              .replace(/\n/g, ' ')
              .replace(/\r/g, '')
              .trim();
            result = JSON.parse(cleanedJson);
          } else {
            throw new Error("無法從回應中提取 JSON");
          }
        } catch (extractError) {
          console.warn(`[YouTube] JSON 解析失敗，嘗試手動提取欄位:`, parseError);
          // 最後嘗試：手動提取關鍵欄位
          const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
          const summaryMatch = responseText.match(/"summary"\s*:\s*"([^"]+)"/);
          const scriptMatch = responseText.match(/"podcastScript"\s*:\s*"([^"]+)"/);
          
          if (summaryMatch && scriptMatch) {
            result = {
              title: titleMatch ? titleMatch[1] : undefined,
              transcription: summaryMatch[1],
              summary: summaryMatch[1],
              podcastScript: scriptMatch[1],
            };
          } else {
            throw new Error(`無法解析 Gemini 回應為 JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
        }
      }

      // 驗證結果格式
      if (!result.summary || !result.podcastScript) {
        throw new Error("Gemini 回應格式不正確，缺少必要欄位");
      }

      console.log(`[YouTube] Gemini 直接分析成功（使用模型：${modelName}）`);
      
      return {
        transcription: result.transcription || result.summary || "（由 AI 分析生成）",
        summary: result.summary,
        podcastScript: result.podcastScript,
        language: "zh",
        title: result.title,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      
      // 對於 JSON 解析錯誤，記錄警告但不中斷（會繼續嘗試下一個模型）
      if (errorMessage.includes("JSON") || errorMessage.includes("control character") || errorMessage.includes("parse")) {
        console.warn(`[YouTube] Model ${modelName} JSON parsing issue (will try next model):`, errorMessage.substring(0, 100));
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // 嘗試下一個模型
      }
      
      console.warn(`[YouTube] Model ${modelName} failed:`, errorMessage.substring(0, 200));
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 處理速率限制錯誤（429）- 嘗試下一個模型
      if (errorMessage.includes("429") || 
          errorMessage.includes("quota") || 
          errorMessage.includes("rate limit") ||
          errorMessage.includes("Too Many Requests")) {
        console.warn(`[YouTube] Rate limit exceeded for ${modelName}, trying next model...`);
        continue;
      }
      
      // 如果是 404 或模型不存在錯誤，嘗試下一個模型
      if (errorMessage.includes("404") || 
          errorMessage.includes("not found") || 
          errorMessage.includes("NOT_FOUND")) {
        continue;
      }
      
      // 對於其他錯誤，如果是第一個模型失敗，嘗試下一個；否則拋出
      if (modelName === modelNames[0]) {
        continue; // 第一個模型失敗，嘗試下一個
      } else {
        throw error; // 其他模型失敗，拋出錯誤
      }
    }
  }
  
  // 所有模型都失敗，這是正常的回退流程，不應該顯示為錯誤
  console.log(`[YouTube] Gemini 直接分析不可用（所有模型都失敗），將使用傳統方式（下載+轉錄）`);
  throw lastError || new Error("Gemini 直接分析不可用，將使用傳統方式");
}

/**
 * 完整的 YouTube 轉 Podcast 處理流程
 * 優先使用 Gemini 直接分析（快速），如果失敗則回退到傳統方式
 */
export async function processYoutubeToPodcast(youtubeUrl: string): Promise<{
  transcription: string;
  summary: string;
  podcastScript: string;
  language: string;
  duration: number;
  audioUrl: string;
  audioFileKey: string;
  title?: string;
}> {
  // 驗證 URL
  if (!isValidYoutubeUrl(youtubeUrl)) {
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "無效的 YouTube 網址",
      { url: youtubeUrl }
    );
  }

  console.log(`[YouTube] 開始處理: ${youtubeUrl}`);

  // 優先嘗試：使用 Gemini 直接分析（快速方式）
  try {
    console.log(`[YouTube] 嘗試使用 Gemini 直接分析...`);
    const directResult = await analyzeYoutubeUrlDirectly(youtubeUrl);
    
    // 生成假的 audioUrl 和 fileKey（因為沒有實際下載）
    const videoId = extractVideoId(youtubeUrl) || "unknown";
    const fakeFileKey = `podcast-audio/${videoId}-gemini-direct.mp3`;
    
    console.log(`[YouTube] Gemini 直接分析成功！`);
    
    return {
      transcription: directResult.transcription,
      summary: directResult.summary,
      podcastScript: directResult.podcastScript,
      language: directResult.language,
      duration: 0, // 無法獲取實際時長
      audioUrl: "", // 沒有實際音檔
      audioFileKey: fakeFileKey,
      title: directResult.title,
    };
  } catch (error) {
    // 這是正常的回退流程，不應該顯示為錯誤
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // 所有這些情況都是正常的回退，使用 info 級別而非 warn/error
    if (errorMsg.includes("Gemini 直接分析不可用") || 
        errorMsg.includes("所有模型都失敗") ||
        errorMsg.includes("所有 Gemini 模型都無法使用") ||
        errorMsg.includes("Rate limit") ||
        errorMsg.includes("429") ||
        errorMsg.includes("404") ||
        errorMsg.includes("JSON") ||
        errorMsg.includes("control character") ||
        errorMsg.includes("quota")) {
      console.log(`[YouTube] ℹ️  Gemini 直接分析不可用，使用傳統方式（下載+轉錄）`);
    } else {
      // 其他未知錯誤，記錄但不中斷
      console.log(`[YouTube] ℹ️  使用傳統方式處理（下載+轉錄）`);
    }
    
    // 回退到傳統方式：下載並轉錄
    console.log(`[YouTube] 使用傳統方式：下載並轉錄...`);
  const transcriptionResult = await transcribeYoutubeVideo(youtubeUrl);
    console.log(`[YouTube] 轉錄完成，文字長度: ${transcriptionResult.text.length} 字元`);

    console.log(`[YouTube] 開始分析內容...`);
  const analysisResult = await analyzePodcastContent(transcriptionResult.text);
    console.log(`[YouTube] 內容分析完成`);

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
}
