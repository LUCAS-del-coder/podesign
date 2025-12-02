/**
 * 音訊合併服務
 * 使用 FFmpeg 將多個音訊檔案合併成一個完整的 Podcast
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = ffmpegInstaller.path;

export interface AudioSegment {
  url: string; // 音訊 URL
  localPath?: string; // 本地檔案路徑（如果已下載）
}

/**
 * 下載音訊檔案到本地臨時目錄
 */
async function downloadAudio(audioUrl: string): Promise<string> {
  const tempFilePath = path.join(
    "/tmp",
    `merge_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
  );

  try {
    console.log(`[AudioMerge] Downloading audio from: ${audioUrl}`);
    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(buffer));

    console.log(`[AudioMerge] Audio downloaded to: ${tempFilePath}`);
    return tempFilePath;
  } catch (error) {
    // 清理失敗的下載
    try {
      await fs.unlink(tempFilePath);
    } catch {}

    throw new Error(
      `Failed to download audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * 合併多個音訊檔案
 * @param segments 音訊片段陣列（按順序）
 * @param outputPath 輸出路徑（可選，預設自動生成）
 * @returns 合併後的音訊檔案路徑
 */
export async function mergeAudioSegments(
  segments: AudioSegment[],
  outputPath?: string
): Promise<string> {
  if (segments.length === 0) {
    throw new Error("No audio segments to merge");
  }

  // 過濾掉空的片段
  const validSegments = segments.filter((s) => s.url || s.localPath);
  if (validSegments.length === 0) {
    throw new Error("No valid audio segments to merge");
  }

  // 如果只有一個片段，直接返回
  if (validSegments.length === 1) {
    const segment = validSegments[0];
    if (segment.localPath) {
      return segment.localPath;
    }
    // 下載並返回
    return await downloadAudio(segment.url);
  }

  // 生成輸出路徑
  const output = outputPath || path.join(
    "/tmp",
    `merged_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
  );

  // 下載所有音訊檔案到本地
  const localPaths: string[] = [];
  try {
    for (const segment of validSegments) {
      if (segment.localPath) {
        localPaths.push(segment.localPath);
      } else {
        const localPath = await downloadAudio(segment.url);
        localPaths.push(localPath);
      }
    }

    // 創建 FFmpeg concat 文件
    const concatFilePath = path.join(
      "/tmp",
      `concat_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`
    );
    const concatContent = localPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await fs.writeFile(concatFilePath, concatContent, "utf-8");

    // 使用 FFmpeg 合併音訊
    const args = [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFilePath,
      "-c",
      "copy", // 使用 copy 模式以保持原始品質並加快速度
      output,
    ];

    console.log(
      `[AudioMerge] Merging ${localPaths.length} audio segments with FFmpeg...`
    );
    await execFileAsync(FFMPEG_PATH, args, {
      maxBuffer: 1024 * 1024 * 10,
    });
    console.log(`[AudioMerge] Audio merged successfully: ${output}`);

    // 清理 concat 文件
    try {
      await fs.unlink(concatFilePath);
    } catch (error) {
      console.warn(`[AudioMerge] Failed to clean up concat file: ${concatFilePath}`, error);
    }

    return output;
  } catch (error) {
    console.error("[AudioMerge] Failed to merge audio:", error);
    throw new Error(
      `Failed to merge audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // 清理下載的臨時檔案（但保留已存在的 localPath）
    for (let i = 0; i < localPaths.length; i++) {
      const segment = validSegments[i];
      // 只清理我們下載的檔案，不清理原本就存在的 localPath
      if (!segment.localPath && localPaths[i]) {
        try {
          await fs.unlink(localPaths[i]);
          console.log(`[AudioMerge] Cleaned up temp file: ${localPaths[i]}`);
        } catch (error) {
          console.warn(
            `[AudioMerge] Failed to clean up temp file: ${localPaths[i]}`,
            error
          );
        }
      }
    }
  }
}

/**
 * 合併 intro、main 和 outro 音訊
 * @param introUrl 開場音訊 URL（可選）
 * @param mainUrl 主要內容音訊 URL
 * @param outroUrl 結尾音訊 URL（可選）
 * @returns 合併後的音訊檔案路徑
 */
export async function mergePodcastAudio(
  introUrl?: string,
  mainUrl?: string,
  outroUrl?: string
): Promise<string> {
  const segments: AudioSegment[] = [];

  if (introUrl) {
    segments.push({ url: introUrl });
  }

  if (mainUrl) {
    segments.push({ url: mainUrl });
  }

  if (outroUrl) {
    segments.push({ url: outroUrl });
  }

  if (segments.length === 0) {
    throw new Error("No audio segments to merge");
  }

  return await mergeAudioSegments(segments);
}

