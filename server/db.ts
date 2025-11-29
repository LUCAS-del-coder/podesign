import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000; // 5 秒

/**
 * 創建資料庫連接池
 */
function createConnectionPool(): mysql.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set!");
  }

  // 解析 DATABASE_URL (格式: mysql://user:password@host:port/database)
  const url = new URL(process.env.DATABASE_URL);
  
  const pool = mysql.createPool({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // 移除前導斜線
    waitForConnections: true,
    connectionLimit: 10, // 最大連接數
    queueLimit: 0, // 無限制排隊
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // 連接超時設定
    connectTimeout: 10000, // 10 秒
    // 注意：MySQL2 不支援 reconnect 選項，我們使用手動重連機制（handleReconnect）
  });

  // 監聽連接錯誤
  pool.on("connection", (connection) => {
    console.log("[Database] New connection established");
    _reconnectAttempts = 0; // 重置重連計數
  });

  pool.on("error", (error) => {
    console.error("[Database] Pool error:", error);
    
    // 如果是連接錯誤，嘗試重連
    if (error.code === "PROTOCOL_CONNECTION_LOST" || 
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT") {
      handleReconnect();
    }
  });

  return pool;
}

/**
 * 處理資料庫重連
 */
async function handleReconnect(): Promise<void> {
  if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[Database] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
    _db = null;
    _pool = null;
    return;
  }

  _reconnectAttempts++;
  const delay = RECONNECT_DELAY_MS * _reconnectAttempts; // 指數退避
  
  console.log(`[Database] Attempting to reconnect (${_reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
  
  // 關閉舊連接
  if (_pool) {
    try {
      await _pool.end();
    } catch (error) {
      console.warn("[Database] Error closing old pool:", error);
    }
    _pool = null;
    _db = null;
  }

  // 等待後重連
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    _pool = createConnectionPool();
    _db = drizzle(_pool);
    
    // 測試連接
    await _db.execute("SELECT 1");
    console.log("[Database] Reconnection successful");
    _reconnectAttempts = 0;
  } catch (error) {
    console.error("[Database] Reconnection failed:", error);
    // 遞迴重試
    await handleReconnect();
  }
}

/**
 * 獲取資料庫實例（帶連接池和重連機制）
 */
export async function getDb() {
  if (!process.env.DATABASE_URL) {
    console.error("[Database] DATABASE_URL environment variable is not set!");
    return null;
  }

  // 如果連接池不存在或已關閉，創建新的
  if (!_pool || !_db) {
    try {
      console.log("[Database] Creating connection pool...");
      _pool = createConnectionPool();
      _db = drizzle(_pool);
      
      // 測試連接
      await _db.execute("SELECT 1");
      console.log("[Database] Database connection pool created successfully");
      _reconnectAttempts = 0;
    } catch (error) {
      console.error("[Database] Failed to create connection pool:", error);
      
      // 嘗試重連
      await handleReconnect();
      
      if (!_db) {
        return null;
      }
    }
  }

  // 驗證連接是否仍然有效
  try {
    await _db.execute("SELECT 1");
  } catch (error: any) {
    // 連接已斷開，嘗試重連
    if (error.code === "PROTOCOL_CONNECTION_LOST" || 
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT") {
      console.warn("[Database] Connection lost, attempting to reconnect...");
      await handleReconnect();
      
      if (!_db) {
        return null;
      }
    } else {
      throw error;
    }
  }

  return _db;
}

/**
 * 關閉資料庫連接池（用於優雅關閉）
 */
export async function closeDb(): Promise<void> {
  if (_pool) {
    console.log("[Database] Closing connection pool...");
    try {
      await _pool.end();
      console.log("[Database] Connection pool closed");
    } catch (error) {
      console.error("[Database] Error closing connection pool:", error);
    } finally {
      _pool = null;
      _db = null;
    }
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createPasswordUser(user: {
  username: string;
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(users).values({
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    loginMethod: 'password',
    lastSignedIn: new Date(),
  });

  return Number((result as any).insertId);
}

/**
 * Podcast 任務相關查詢
 */
import { podcastTasks, InsertPodcastTask, PodcastTask } from "../drizzle/schema";
import { desc } from "drizzle-orm";

/**
 * 建立新的 podcast 任務
 */
export async function createPodcastTask(task: Omit<InsertPodcastTask, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(podcastTasks).values(task);
  return Number(result[0].insertId);
}

/**
 * 更新 podcast 任務狀態
 */
export async function updatePodcastTask(
  taskId: number,
  updates: Partial<Omit<PodcastTask, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(podcastTasks).set(updates).where(eq(podcastTasks.id, taskId));
}

/**
 * 獲取使用者的所有 podcast 任務
 */
export async function getUserPodcastTasks(userId: number): Promise<PodcastTask[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(podcastTasks)
    .where(eq(podcastTasks.userId, userId))
    .orderBy(desc(podcastTasks.createdAt));
}

/**
 * 獲取單一 podcast 任務
 */
export async function getPodcastTask(taskId: number, userId: number): Promise<PodcastTask | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db
    .select()
    .from(podcastTasks)
    .where(eq(podcastTasks.id, taskId))
    .limit(1);

  const task = result[0];
  if (!task) {
    return undefined;
  }
  
  // 如果 userId 為 -1，跳過檢查（用於內部查詢）
  if (userId !== -1 && task.userId !== userId) {
    return undefined;
  }

  return task;
}

/**
 * 聲音偏好設定相關查詢
 */
import { voicePreferences, VoicePreference } from "../drizzle/schema";

/**
 * 獲取使用者的聲音偏好設定
 */
export async function getVoicePreference(userId: number): Promise<VoicePreference | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db
    .select()
    .from(voicePreferences)
    .where(eq(voicePreferences.userId, userId))
    .limit(1);

  return result[0];
}

/**
 * 儲存使用者的聲音偏好設定
 */
export async function saveVoicePreference(
  userId: number,
  host1VoiceId: string,
  host2VoiceId: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 使用 upsert （插入或更新）
  await db
    .insert(voicePreferences)
    .values({
      userId,
      host1VoiceId,
      host2VoiceId,
    })
    .onDuplicateKeyUpdate({
      set: {
        host1VoiceId,
        host2VoiceId,
        updatedAt: new Date(),
      },
    });
}

// TODO: add feature queries here as your schema grows.

/**
 * 精華片段相關查詢
 */
import { podcastHighlights, InsertPodcastHighlight, PodcastHighlight } from "../drizzle/schema";

/**
 * 儲存精華片段
 */
export async function saveHighlight(
  highlight: Omit<InsertPodcastHighlight, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(podcastHighlights).values(highlight);
  return Number(result[0].insertId);
}

/**
 * 獲取任務的所有精華片段
 */
export async function getTaskHighlights(taskId: number, userId: number): Promise<PodcastHighlight[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(podcastHighlights)
    .where(eq(podcastHighlights.taskId, taskId))
    .orderBy(podcastHighlights.startTime);
}

/**
 * 獲取單一精華片段
 */
export async function getHighlight(highlightId: number, userId: number): Promise<PodcastHighlight | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db
    .select()
    .from(podcastHighlights)
    .where(eq(podcastHighlights.id, highlightId))
    .limit(1);

  const highlight = result[0];
  if (!highlight || highlight.userId !== userId) {
    return undefined;
  }

  return highlight;
}

// ============================================


export async function deleteHighlight(highlightId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 驗證精華片段屬於該使用者
  const highlight = await getHighlight(highlightId, userId);
  if (!highlight) {
    throw new Error("Highlight not found or does not belong to user");
  }

  await db.delete(podcastHighlights).where(eq(podcastHighlights.id, highlightId));
}

export async function deletePodcastTask(taskId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 驗證任務屬於該使用者
  const task = await getPodcastTask(taskId, userId);
  if (!task) {
    throw new Error("Task not found or does not belong to user");
  }

  // 刪除任務（級聯刪除會自動刪除精華片段和虛擬主播影片）
  await db.delete(podcastTasks).where(eq(podcastTasks.id, taskId));
}


// ============================================
// Avatar Video Tasks 相關查詢
// ============================================

import { avatarVideoTasks, InsertAvatarVideoTask, AvatarVideoTask } from "../drizzle/schema";

export async function createAvatarVideoTask(task: Omit<InsertAvatarVideoTask, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(avatarVideoTasks).values(task);
  return Number(result[0].insertId);
}

export async function getAvatarVideoTask(id: number): Promise<AvatarVideoTask | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(avatarVideoTasks).where(eq(avatarVideoTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAvatarVideoTaskByApiId(apiVideoId: string): Promise<AvatarVideoTask | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(avatarVideoTasks).where(eq(avatarVideoTasks.apiVideoId, apiVideoId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getHighlightAvatarVideos(highlightId: number, userId: number): Promise<AvatarVideoTask[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(avatarVideoTasks)
    .where(and(eq(avatarVideoTasks.highlightId, highlightId), eq(avatarVideoTasks.userId, userId)))
    .orderBy(desc(avatarVideoTasks.createdAt));
}

export async function updateAvatarVideoTask(id: number, updates: Partial<AvatarVideoTask>): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(avatarVideoTasks).set(updates).where(eq(avatarVideoTasks.id, id));
}
