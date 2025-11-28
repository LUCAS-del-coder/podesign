import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("podcast router", () => {
  describe("podcast.create", () => {
    it("應該拒絕無效的 YouTube URL", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.podcast.create({ youtubeUrl: "https://invalid-url.com" })
      ).rejects.toThrow("無效的 YouTube 網址");
    });

    it("應該接受有效的 YouTube URL 並建立任務", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const validUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const result = await caller.podcast.create({ youtubeUrl: validUrl });

      expect(result).toHaveProperty("taskId");
      expect(typeof result.taskId).toBe("number");
    });

    it("應該接受 youtu.be 短網址格式", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const validUrl = "https://youtu.be/dQw4w9WgXcQ";
      const result = await caller.podcast.create({ youtubeUrl: validUrl });

      expect(result).toHaveProperty("taskId");
      expect(typeof result.taskId).toBe("number");
    });
  });

  describe("podcast.list", () => {
    it("應該返回使用者的任務列表", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const tasks = await caller.podcast.list();

      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe("podcast.get", () => {
    it("應該在找不到任務時拋出錯誤", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.podcast.get({ taskId: 999999 })
      ).rejects.toThrow("找不到該任務");
    });
  });
});

import { isValidYoutubeUrl } from "./youtubeService";

describe("YouTube URL 驗證", () => {

  it("應該接受標準 YouTube URL", () => {
    expect(isValidYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidYoutubeUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("應該接受 youtu.be 短網址", () => {
    expect(isValidYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("應該接受嵌入式 URL", () => {
    expect(isValidYoutubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
  });

  it("應該拒絕無效的 URL", () => {
    expect(isValidYoutubeUrl("https://www.google.com")).toBe(false);
    expect(isValidYoutubeUrl("https://example.com/watch?v=123")).toBe(false);
    expect(isValidYoutubeUrl("not a url")).toBe(false);
  });
});
