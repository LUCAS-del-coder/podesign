import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
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

describe("FFmpeg Waveform Video Generation", () => {
  it("should generate video with waveform and subtitles", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. 獲取一個已完成的任務
    const tasks = await caller.podcast.list();
    console.log(`Found ${tasks.length} tasks`);

    const completedTask = tasks.find((t) => t.status === "completed" && t.audioUrl);
    if (!completedTask) {
      console.log("No completed task with audio found, skipping test");
      return;
    }

    console.log(`Using task: ${completedTask.title} (ID: ${completedTask.id})`);

    // 2. 生成精華片段
    console.log("Generating highlights...");
    const highlightsResult = await caller.podcast.generateHighlights({
      taskId: completedTask.id,
      targetDuration: 60,
      mode: "std",
    });

    console.log(`Generated ${highlightsResult.highlights.length} highlights`);

    if (highlightsResult.highlights.length === 0) {
      console.log("No highlights generated, skipping video generation test");
      return;
    }

    // 3. 選擇第一個精華片段生成影片
    const firstHighlight = highlightsResult.highlights[0];
    console.log(`Using highlight: ${firstHighlight.title} (ID: ${firstHighlight.id})`);
    console.log(`Duration: ${firstHighlight.duration}s`);

    // 4. 生成波形影片
    console.log("Generating waveform video...");
    const videoResult = await caller.podcast.generateWaveformVideo({
      highlightId: firstHighlight.id,
    });

    console.log("Video generated successfully!");
    console.log(`Video URL: ${videoResult.videoUrl}`);
    console.log(`File Key: ${videoResult.fileKey}`);

    // 驗證結果
    expect(videoResult.videoUrl).toBeTruthy();
    expect(videoResult.fileKey).toBeTruthy();
    expect(videoResult.message).toBe("影片生成成功");
  }, 300000); // 5 分鐘超時
});
