import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Optional for password-based auth. */
  openId: varchar("openId", { length: 64 }).unique(),
  /** Username for password-based authentication */
  username: varchar("username", { length: 64 }).unique(),
  /** Hashed password for password-based authentication */
  passwordHash: varchar("password_hash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Podcast 製作任務表
 * 儲存每個從 YouTube 網址轉換為 Podcast 的任務記錄
 */
export const podcastTasks = mysqlTable("podcast_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  youtubeUrl: varchar("youtube_url", { length: 512 }).notNull(),
  title: varchar("title", { length: 512 }), // 任務標題（從 YouTube 影片標題或使用者輸入）
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  
  // 處理進度詳情
  progressStage: mysqlEnum("progress_stage", [
    "queued",           // 排隊中
    "downloading",      // 下載音訊中
    "transcribing",     // 轉錄中
    "analyzing",        // AI 分析中
    "generating",       // 生成 Podcast 中
    "completed",        // 完成
    "failed"            // 失敗
  ]).default("queued"),
  progressPercent: int("progress_percent").default(0), // 進度百分比 (0-100)
  progressMessage: text("progress_message"), // 當前進度訊息
  estimatedTimeRemaining: int("estimated_time_remaining"), // 預估剩餘時間（秒）
  
  // 處理結果
  audioUrl: text("audio_url"), // S3 音檔 URL
  audioFileKey: text("audio_file_key"), // S3 檔案 key
  transcription: text("transcription"), // 完整逐字稿
  summary: text("summary"), // 精華摘要
  podcastScript: text("podcast_script"), // Podcast 格式文字稿
  
  // ListenHub Podcast 生成結果
  listenHubEpisodeId: varchar("listen_hub_episode_id", { length: 64 }), // ListenHub Episode ID
  podcastAudioUrl: text("podcast_audio_url"), // ListenHub 生成的 Podcast 音檔 URL
  podcastTitle: text("podcast_title"), // ListenHub 生成的標題
  podcastScripts: text("podcast_scripts"), // ListenHub 生成的對話腳本 (JSON)
  
  // 錯誤訊息
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PodcastTask = typeof podcastTasks.$inferSelect;
export type InsertPodcastTask = typeof podcastTasks.$inferInsert;

/**
 * 使用者聲音偏好設定表
 * 儲存使用者選擇的 ListenHub 聲音 ID
 */
export const voicePreferences = mysqlTable("voice_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(), // 每個使用者只有一筆偏好設定
  host1VoiceId: varchar("host1_voice_id", { length: 64 }), // 主持人 1 的聲音 ID
  host2VoiceId: varchar("host2_voice_id", { length: 64 }), // 主持人 2 的聲音 ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type VoicePreference = typeof voicePreferences.$inferSelect;
export type InsertVoicePreference = typeof voicePreferences.$inferInsert;

/**
 * Podcast 精華片段表
 * 儲存從完整 Podcast 中自動剪輯出的精華片段
 */
export const podcastHighlights = mysqlTable("podcast_highlights", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull(), // 關聯到 podcast_tasks
  userId: int("user_id").notNull(),
  
  // 精華片段資訊
  title: varchar("title", { length: 256 }), // 精華片段標題
  description: text("description"), // 精華片段描述
  startTime: int("start_time").notNull(), // 開始時間（秒）
  endTime: int("end_time").notNull(), // 結束時間（秒）
  duration: int("duration").notNull(), // 持續時間（秒）
  
  // 剪輯結果
  audioUrl: text("audio_url"), // S3 精華片段音檔 URL
  audioFileKey: text("audio_file_key"), // S3 檔案 key
  
  // 精華片段文字內容
  transcript: text("transcript"), // 精華片段的文字稿
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PodcastHighlight = typeof podcastHighlights.$inferSelect;
export type InsertPodcastHighlight = typeof podcastHighlights.$inferInsert;

/**
 * 虛擬主播影片任務表
 * 儲存使用 HeyGen Avatar API 生成虛擬主播影片的任務記錄
 */
export const avatarVideoTasks = mysqlTable("avatar_video_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  highlightId: int("highlight_id").notNull(), // 關聯到 podcast_highlights
  
  // API 任務資訊
  apiVideoId: varchar("api_video_id", { length: 128 }), // HeyGen 返回的影片 ID
  externalTaskId: varchar("external_task_id", { length: 128 }), // 自定義任務 ID
  
  // 任務狀態
  status: mysqlEnum("status", ["pending", "submitted", "processing", "completed", "failed"]).default("pending").notNull(),
  statusMessage: text("status_message"), // 狀態訊息（失敗原因等）
  
  // 輸入資料
  avatarImageUrl: text("avatar_image_url"), // 虛擬主播圖片 URL
  audioUrl: text("audio_url"), // 音訊 URL
  prompt: text("prompt"), // 文字提示
  mode: varchar("mode", { length: 16 }).default("std"), // std 或 pro
  
  // 生成結果
  videoUrl: text("video_url"), // HeyGen 生成的影片 URL
  thumbnailUrl: text("thumbnail_url"), // 影片縮圖 URL
  duration: int("duration"), // 影片時長（秒）
  
  // 錯誤訊息
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AvatarVideoTask = typeof avatarVideoTasks.$inferSelect;
export type InsertAvatarVideoTask = typeof avatarVideoTasks.$inferInsert;
