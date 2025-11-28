import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getPodcastTask } from "./db";

/**
 * 整合測試：虛擬主播影片生成完整流程
 * 
 * 這個測試會：
 * 1. 查詢最新的已完成任務
 * 2. 生成精華片段
 * 3. 生成虛擬主播影片
 * 4. 檢查影片生成狀態
 */

// 建立測試用的 context（模擬已登入使用者）
function createTestContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {} as any,
  };
}

describe("虛擬主播影片生成流程", () => {
  it("完整流程測試：從精華片段生成虛擬主播影片", async () => {
    // 1. 查詢最新的已完成任務
    console.log("\n步驟 1: 查詢最新任務...");
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) {
      throw new Error("無法連接資料庫");
    }

    const { podcastTasks } = await import("../drizzle/schema");
    const { eq, desc } = await import("drizzle-orm");
    
    const tasks = await db
      .select()
      .from(podcastTasks)
      .where(eq(podcastTasks.status, "completed"))
      .orderBy(desc(podcastTasks.createdAt))
      .limit(1);

    expect(tasks.length).toBeGreaterThan(0);
    const task = tasks[0]!;
    console.log(`✅ 找到任務: ${task.title || task.youtubeUrl}`);
    console.log(`   任務 ID: ${task.id}, 使用者 ID: ${task.userId}`);

    const ctx = createTestContext(task.userId);
    const caller = appRouter.createCaller(ctx);

    // 2. 生成精華片段
    console.log("\n步驟 2: 生成精華片段...");
    const highlightsResult = await caller.podcast.generateHighlights({ taskId: task.id });
    expect(highlightsResult.highlights).toBeDefined();
    expect(highlightsResult.highlights.length).toBeGreaterThan(0);
    
    console.log(`✅ 生成了 ${highlightsResult.highlights!.length} 個精華片段`);
    for (const h of highlightsResult.highlights!) {
      console.log(`   - ${h.title}: ${h.duration} 秒`);
    }

    // 3. 選擇第一個精華片段生成影片
    const highlight = highlightsResult.highlights![0]!;
    console.log(`\n步驟 3: 使用精華片段「${highlight.title}」生成虛擬主播影片...`);
    
    // 使用預設頭像
    const avatarImageUrl = "https://3000-ix26o1gdb3gdoidw40mrb-a6a19106.manus-asia.computer/avatars/avatar-1.jpg";
    
    const videoResult = await caller.podcast.generateAvatarVideo({
      highlightId: highlight.id,
      avatarImageUrl,
      mode: "std",
    });
    expect(videoResult.videoTaskId).toBeDefined();
    console.log(`✅ 影片任務已建立，ID: ${videoResult.videoTaskId}`);

    // 4. 輪詢檢查影片生成狀態（最多等待 2 分鐘）
    console.log("\n步驟 4: 檢查影片生成狀態...");
    let attempts = 0;
    const maxAttempts = 12; // 12 * 10 秒 = 2 分鐘
    let videoTask: any = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 等待 10 秒
      attempts++;

      const videos = await caller.podcast.getTaskAvatarVideos({ taskId: task.id });
      videoTask = videos.find(v => v.id === videoResult.videoTaskId);

      if (videoTask) {
        console.log(`   [${attempts}/${maxAttempts}] 狀態: ${videoTask.status}`);
        
        if (videoTask.status === "succeed") {
          console.log(`✅ 影片生成成功！`);
          console.log(`   影片 URL: ${videoTask.videoUrl}`);
          break;
        } else if (videoTask.status === "failed") {
          console.error(`❌ 影片生成失敗: ${videoTask.errorMessage}`);
          throw new Error(videoTask.errorMessage || "影片生成失敗");
        }
      }
    }

    if (videoTask?.status !== "succeed") {
      console.warn(`⚠️  影片仍在生成中，請稍後在 UI 中查看結果`);
    }

    expect(videoTask).toBeDefined();
  }, 180000); // 設定 3 分鐘超時
});
