/**
 * 任務進度更新服務
 * 提供統一的進度更新介面
 */

import { updatePodcastTask } from "../db";

export type ProgressStage =
  | "queued"
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "generating"
  | "completed"
  | "failed";

export interface ProgressUpdate {
  taskId: number;
  stage: ProgressStage;
  percent: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // 秒
}

/**
 * 更新任務進度
 */
export async function updateProgress(update: ProgressUpdate): Promise<void> {
  const { taskId, stage, percent, message, estimatedTimeRemaining } = update;

  console.log(`[Progress] Task ${taskId}: ${stage} - ${percent}% - ${message}`);

  await updatePodcastTask(taskId, {
    progressStage: stage,
    progressPercent: Math.min(100, Math.max(0, percent)),
    progressMessage: message,
    estimatedTimeRemaining: estimatedTimeRemaining || null,
    status: stage === "completed" ? "completed" : stage === "failed" ? "failed" : "processing",
  });
}

/**
 * 進度階段的預設百分比範圍
 */
const STAGE_RANGES: Record<ProgressStage, [number, number]> = {
  queued: [0, 0],
  downloading: [0, 20],
  transcribing: [20, 50],
  analyzing: [50, 70],
  generating: [70, 100],
  completed: [100, 100],
  failed: [0, 0],
};

/**
 * 計算階段內的進度百分比
 * @param stage 當前階段
 * @param stagePercent 階段內的進度 (0-100)
 */
export function calculateOverallPercent(stage: ProgressStage, stagePercent: number): number {
  const [start, end] = STAGE_RANGES[stage];
  return Math.round(start + (end - start) * (stagePercent / 100));
}

/**
 * 預估剩餘時間（基於經驗值）
 */
export function estimateTimeRemaining(stage: ProgressStage, stagePercent: number): number {
  // 各階段的平均耗時（秒）
  const STAGE_DURATIONS: Record<ProgressStage, number> = {
    queued: 5,
    downloading: 30,
    transcribing: 60,
    analyzing: 45,
    generating: 90,
    completed: 0,
    failed: 0,
  };

  // 計算當前階段剩餘時間
  const currentStageRemaining = STAGE_DURATIONS[stage] * (1 - stagePercent / 100);

  // 計算後續階段的時間
  const stages: ProgressStage[] = ["queued", "downloading", "transcribing", "analyzing", "generating"];
  const currentIndex = stages.indexOf(stage);
  const remainingStages = stages.slice(currentIndex + 1);
  const futureTime = remainingStages.reduce((sum, s) => sum + STAGE_DURATIONS[s], 0);

  return Math.round(currentStageRemaining + futureTime);
}
