import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createPodcastTask, updatePodcastTask } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("podcast.generateHighlights", () => {
  let testTaskId: number;

  beforeAll(async () => {
    // 建立測試任務
    testTaskId = await createPodcastTask({
      userId: 1,
      youtubeUrl: "https://www.youtube.com/watch?v=test",
      status: "completed",
    });

    // 更新任務為已完成狀態，並加入測試資料
    await updatePodcastTask(testTaskId, {
      status: "completed",
      podcastAudioUrl: "https://example.com/test.mp3",
      podcastScripts: JSON.stringify([
        {
          speakerId: "host1",
          speakerName: "主持人 1",
          content: "歡迎收聽今天的節目，我們將討論人工智慧的未來發展。",
        },
        {
          speakerId: "host2",
          speakerName: "主持人 2",
          content: "是的，這是一個非常有趣的話題。AI 正在改變我們的生活方式。",
        },
        {
          speakerId: "host1",
          speakerName: "主持人 1",
          content: "沒錯！特別是在醫療、教育和娛樂領域，AI 的應用越來越廣泛。",
        },
        {
          speakerId: "host2",
          speakerName: "主持人 2",
          content: "我認為最重要的是如何確保 AI 的發展符合倫理規範。",
        },
        {
          speakerId: "host1",
          speakerName: "主持人 1",
          content: "這確實是一個關鍵問題。我們需要在創新和責任之間找到平衡。",
        },
      ]),
    });
  });

  it("should reject if task not found", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.podcast.generateHighlights({ taskId: 999999 })
    ).rejects.toThrow("找不到該任務");
  });

  it("should reject if task not completed", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 建立一個未完成的任務
    const pendingTaskId = await createPodcastTask({
      userId: 1,
      youtubeUrl: "https://www.youtube.com/watch?v=pending",
      status: "pending",
    });

    await expect(
      caller.podcast.generateHighlights({ taskId: pendingTaskId })
    ).rejects.toThrow("Podcast 還未生成完成");
  });

  it("should reject if podcast audio not exists", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 建立一個沒有音檔的任務
    const incompleteTaskId = await createPodcastTask({
      userId: 1,
      youtubeUrl: "https://www.youtube.com/watch?v=incomplete",
      status: "completed",
    });

    await expect(
      caller.podcast.generateHighlights({ taskId: incompleteTaskId })
    ).rejects.toThrow("音檔不存在");
  });

  // 注意：這個測試需要實際的 LLM 和 FFmpeg，在 CI 環境中可能會失敗
  // 可以考慮 mock 這些服務
  it.skip("should generate highlights successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.podcast.generateHighlights({
      taskId: testTaskId,
      targetDuration: 30,
    });

    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
    expect(result.highlights.length).toBeGreaterThan(0);

    // 檢查每個精華片段的結構
    result.highlights.forEach((highlight) => {
      expect(highlight.id).toBeDefined();
      expect(highlight.title).toBeDefined();
      expect(highlight.description).toBeDefined();
      expect(highlight.audioUrl).toBeDefined();
      expect(highlight.duration).toBeGreaterThan(0);
    });
  });
});

describe("podcast.getHighlights", () => {
  it("should return empty array if no highlights", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 建立一個新任務
    const taskId = await createPodcastTask({
      userId: 1,
      youtubeUrl: "https://www.youtube.com/watch?v=no-highlights",
      status: "completed",
    });

    const result = await caller.podcast.getHighlights({ taskId });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
