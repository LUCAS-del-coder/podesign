import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!process.env.DATABASE_URL) {
    console.error("[Database] DATABASE_URL environment variable is not set!");
    return null;
  }

  if (!_db) {
    try {
      console.log("[Database] Connecting to database...");
      _db = drizzle(process.env.DATABASE_URL);
      // 測試連接
      await _db.execute("SELECT 1");
      console.log("[Database] Database connection successful");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      console.error("[Database] DATABASE_URL format:", process.env.DATABASE_URL ? "Set (hidden)" : "Not set");
      _db = null;
    }
  }
  return _db;
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
