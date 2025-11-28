/**
 * 音訊剪輯服務
 * 使用 FFmpeg 從完整的 Podcast 音檔中剪輯出精華片段
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { storagePut } from "../storage";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = ffmpegInstaller.path;

export interface ClipOptions {
  inputPath: string; // 輸入音檔路徑
  startTime: number; // 開始時間（秒）
  duration: number; // 持續時間（秒）
  outputPath?: string; // 輸出路徑（可選，預設自動生成）
}

/**
 * 使用 FFmpeg 剪輯音訊片段
 * @param options 剪輯選項
 * @returns 剪輯後的音檔路徑
 */
export async function clipAudio(options: ClipOptions): Promise<string> {
  const { inputPath, startTime, duration, outputPath } = options;

  // 檢查輸入檔案是否存在
  try {
    await fs.access(inputPath);
  } catch (error) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // 生成輸出路徑
  const output = outputPath || path.join(
    "/tmp",
    `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
  );

  // 使用內建 FFmpeg 二進位剪輯音訊
  const args = [
    "-i",
    inputPath,
    "-ss",
    `${startTime}`,
    "-t",
    `${duration}`,
    "-acodec",
    "libmp3lame",
    "-b:a",
    "192k",
    output,
  ];

  try {
    console.log(
      `[AudioClipService] Clipping audio with ${FFMPEG_PATH}: ${args.join(" ")}`
    );
    await execFileAsync(FFMPEG_PATH, args, { maxBuffer: 1024 * 1024 * 10 });
    console.log(`[AudioClipService] Audio clipped successfully: ${output}`);
    return output;
  } catch (error) {
    console.error("[AudioClipService] Failed to clip audio:", error);
    throw new Error(`Failed to clip audio: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * 剪輯音訊並上傳到 S3
 * @param options 剪輯選項
 * @param userId 使用者 ID
 * @param taskId 任務 ID
 * @returns S3 URL 和檔案 key
 */
export async function clipAndUploadAudio(
  options: ClipOptions,
  userId: number,
  taskId: number
): Promise<{ url: string; fileKey: string }> {
  let tempFilePath: string | null = null;

  try {
    // 剪輯音訊
    tempFilePath = await clipAudio(options);

    // 讀取檔案
    const fileBuffer = await fs.readFile(tempFilePath);

    // 生成 S3 檔案 key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const fileKey = `podcast-highlights/${userId}/${taskId}/highlight_${timestamp}_${randomSuffix}.mp3`;

    // 上傳到 S3
    console.log(`[AudioClipService] Uploading to S3: ${fileKey}`);
    const { url } = await storagePut(fileKey, fileBuffer, "audio/mpeg");

    console.log(`[AudioClipService] Upload successful: ${url}`);
    return { url, fileKey };
  } finally {
    // 清理臨時檔案
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`[AudioClipService] Cleaned up temp file: ${tempFilePath}`);
      } catch (error) {
        console.warn(`[AudioClipService] Failed to clean up temp file: ${tempFilePath}`, error);
      }
    }
  }
}

/**
 * 下載音訊檔案到本地臨時目錄
 * @param audioUrl 音訊 URL
 * @returns 本地檔案路徑
 */
export async function downloadAudio(audioUrl: string): Promise<string> {
  const tempFilePath = path.join(
    "/tmp",
    `download_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
  );

  try {
    console.log(`[AudioClipService] Downloading audio from: ${audioUrl}`);
    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(buffer));

    console.log(`[AudioClipService] Audio downloaded to: ${tempFilePath}`);
    return tempFilePath;
  } catch (error) {
    // 清理失敗的下載
    try {
      await fs.unlink(tempFilePath);
    } catch {}

    throw new Error(`Failed to download audio: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * 從 URL 下載音訊、剪輯並上傳到 S3
 * @param audioUrl 原始音訊 URL
 * @param startTime 開始時間（秒）
 * @param duration 持續時間（秒）
 * @param userId 使用者 ID
 * @param taskId 任務 ID
 * @returns S3 URL 和檔案 key
 */
export async function clipFromUrlAndUpload(
  audioUrl: string,
  startTime: number,
  duration: number,
  userId: number,
  taskId: number
): Promise<{ url: string; fileKey: string }> {
  let downloadedFilePath: string | null = null;

  try {
    // 下載音訊
    downloadedFilePath = await downloadAudio(audioUrl);

    // 剪輯並上傳
    return await clipAndUploadAudio(
      {
        inputPath: downloadedFilePath,
        startTime,
        duration,
      },
      userId,
      taskId
    );
  } finally {
    // 清理下載的檔案
    if (downloadedFilePath) {
      try {
        await fs.unlink(downloadedFilePath);
        console.log(`[AudioClipService] Cleaned up downloaded file: ${downloadedFilePath}`);
      } catch (error) {
        console.warn(`[AudioClipService] Failed to clean up downloaded file: ${downloadedFilePath}`, error);
      }
    }
  }
}
