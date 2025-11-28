import { describe, expect, it } from "vitest";
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

describe("voice API", () => {
  it("should fetch voice list from ListenHub", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const voices = await caller.voice.list();

    expect(voices).toBeDefined();
    expect(Array.isArray(voices)).toBe(true);
    expect(voices.length).toBeGreaterThan(0);
    
    // 檢查聲音物件結構
    const firstVoice = voices[0];
    expect(firstVoice).toHaveProperty("name");
    expect(firstVoice).toHaveProperty("speakerId");
    expect(firstVoice).toHaveProperty("gender");
    expect(firstVoice).toHaveProperty("language");
  });

  it("should save and retrieve voice preference", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 先獲取可用聲音
    const voices = await caller.voice.list();
    expect(voices.length).toBeGreaterThanOrEqual(2);

    const voice1 = voices[0];
    const voice2 = voices[1];

    // 儲存聲音偏好
    const saveResult = await caller.voice.savePreference({
      host1VoiceId: voice1.speakerId,
      host2VoiceId: voice2.speakerId,
    });

    expect(saveResult).toEqual({ success: true });

    // 讀取聲音偏好
    const preference = await caller.voice.getPreference();

    expect(preference).toBeDefined();
    expect(preference?.host1VoiceId).toBe(voice1.speakerId);
    expect(preference?.host2VoiceId).toBe(voice2.speakerId);
  });

  it("should update existing voice preference", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const voices = await caller.voice.list();
    expect(voices.length).toBeGreaterThanOrEqual(3);

    // 第一次儲存
    await caller.voice.savePreference({
      host1VoiceId: voices[0].speakerId,
      host2VoiceId: voices[1].speakerId,
    });

    // 更新偏好
    await caller.voice.savePreference({
      host1VoiceId: voices[1].speakerId,
      host2VoiceId: voices[2].speakerId,
    });

    // 驗證更新成功
    const preference = await caller.voice.getPreference();
    expect(preference?.host1VoiceId).toBe(voices[1].speakerId);
    expect(preference?.host2VoiceId).toBe(voices[2].speakerId);
  });
});
