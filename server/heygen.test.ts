import { describe, expect, it } from "vitest";
import { listAvatars, listVoices } from "./services/heygenService";

/**
 * HeyGen API 驗證測試
 * 測試 API Key 是否有效
 */
describe("HeyGen API", () => {
  it("should successfully list avatars with valid API key", async () => {
    const avatars = await listAvatars();
    
    expect(avatars).toBeDefined();
    expect(Array.isArray(avatars)).toBe(true);
    expect(avatars.length).toBeGreaterThan(0);
    
    // 檢查第一個 avatar 的結構
    const firstAvatar = avatars[0];
    expect(firstAvatar).toHaveProperty('avatar_id');
    expect(firstAvatar).toHaveProperty('avatar_name');
    
    console.log(`✅ HeyGen API 驗證成功！找到 ${avatars.length} 個 avatars`);
    console.log(`第一個 avatar: ${firstAvatar.avatar_name} (${firstAvatar.avatar_id})`);
  }, 30000); // 30 秒超時

  it("should successfully list voices with valid API key", async () => {
    const voices = await listVoices();
    
    expect(voices).toBeDefined();
    expect(Array.isArray(voices)).toBe(true);
    expect(voices.length).toBeGreaterThan(0);
    
    // 檢查第一個 voice 的結構
    const firstVoice = voices[0];
    expect(firstVoice).toHaveProperty('voice_id');
    expect(firstVoice).toHaveProperty('name');
    expect(firstVoice).toHaveProperty('language');
    
    console.log(`✅ HeyGen API 驗證成功！找到 ${voices.length} 個 voices`);
    console.log(`第一個 voice: ${firstVoice.name} (${firstVoice.language})`);
  }, 30000); // 30 秒超時
});
