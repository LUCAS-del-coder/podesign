import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadAvatarImage, validateImageUrl } from "./uploadService";
import * as storage from "./storage";

// Mock storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

describe("uploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadAvatarImage", () => {
    it("應該成功上傳 PNG 圖片", async () => {
      const mockUrl = "https://s3.example.com/avatars/1/test.png";
      vi.mocked(storage.storagePut).mockResolvedValueOnce({
        url: mockUrl,
        key: "avatars/1/test.png",
      });

      // 建立一個簡單的 base64 PNG 圖片
      const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result = await uploadAvatarImage(base64Data, 1);

      expect(result).toBe(mockUrl);
      expect(storage.storagePut).toHaveBeenCalledWith(
        expect.stringMatching(/^avatars\/1\/\d+-[a-f0-9]+\.png$/),
        expect.any(Buffer),
        "image/png"
      );
    });

    it("應該成功上傳 JPG 圖片", async () => {
      const mockUrl = "https://s3.example.com/avatars/1/test.jpg";
      vi.mocked(storage.storagePut).mockResolvedValueOnce({
        url: mockUrl,
        key: "avatars/1/test.jpg",
      });

      const base64Data = "data:image/jpg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA==";

      const result = await uploadAvatarImage(base64Data, 1);

      expect(result).toBe(mockUrl);
      expect(storage.storagePut).toHaveBeenCalledWith(
        expect.stringMatching(/^avatars\/1\/\d+-[a-f0-9]+\.jpg$/),
        expect.any(Buffer),
        "image/jpeg"
      );
    });

    it("應該在無效的圖片格式時拋出錯誤", async () => {
      const invalidBase64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";

      await expect(uploadAvatarImage(invalidBase64, 1)).rejects.toThrow(
        "無效的圖片格式，僅支援 PNG、JPG、JPEG"
      );
    });

    it("應該在圖片過大時拋出錯誤", async () => {
      // 建立一個超過 10MB 的 base64 字串（約 11MB）
      const largeData = "A".repeat(15 * 1024 * 1024);
      const base64Data = `data:image/png;base64,${Buffer.from(largeData).toString("base64")}`;

      await expect(uploadAvatarImage(base64Data, 1)).rejects.toThrow(
        "圖片檔案過大，最大支援 10MB"
      );
    });
  });

  describe("validateImageUrl", () => {
    it("應該驗證有效的圖片 URL", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === "content-type" ? "image/png" : null),
        },
      });

      const result = await validateImageUrl("https://example.com/image.png");

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/image.png",
        { method: "HEAD" }
      );
    });

    it("應該拒絕無效的圖片 URL（404）", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const result = await validateImageUrl("https://example.com/notfound.png");

      expect(result).toBe(false);
    });

    it("應該拒絕非圖片的 URL", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === "content-type" ? "text/html" : null),
        },
      });

      const result = await validateImageUrl("https://example.com/page.html");

      expect(result).toBe(false);
    });

    it("應該在網路錯誤時返回 false", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const result = await validateImageUrl("https://example.com/image.png");

      expect(result).toBe(false);
    });
  });
});
