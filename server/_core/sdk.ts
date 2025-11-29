import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

class SDKServer {
  constructor() {
    // SDK 已簡化，不再需要 Manus OAuth 服務
    console.log("[Auth] SDK initialized (Google OAuth + Username/Password)");
  }


  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }


  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, loginMethod } = payload as Record<string, unknown>;

      // 驗證 openId（必要）
      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing openId");
        return null;
      }

      // appId 對於 Google OAuth 是可選的（向後相容）
      // name 也是可選的（可以從資料庫取得）
      return {
        openId,
        appId: (isNonEmptyString(appId) ? appId : ""),
        name: (isNonEmptyString(name) ? name : ""),
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }


  async authenticateRequest(req: Request): Promise<User> {
    // Regular authentication flow
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    
    if (!sessionCookie) {
      console.log("[Auth] No session cookie found");
      throw ForbiddenError("No session cookie");
    }
    
    // 嘗試驗證帳號密碼登入的 JWT
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(sessionCookie, secretKey, {
        algorithms: ["HS256"],
      });
      
      // 如果是帳號密碼登入的 JWT（有 userId 欄位）
      if (typeof payload.userId === 'number') {
        // 直接使用 userId 查詢
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { users } = await import('../../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const result = await dbInstance.select().from(users).where(eq(users.id, payload.userId)).limit(1);
          if (result.length > 0) {
            console.log("[Auth] Authenticated via username/password:", payload.userId);
            return result[0];
          }
        }
      }
    } catch (error) {
      // 不是帳號密碼登入的 JWT，繼續嘗試 OAuth
      console.log("[Auth] Not a username/password JWT, trying OAuth session");
    }
    
    // 驗證 session（支援帳號密碼和 Google OAuth）
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      console.log("[Auth] Session verification failed");
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // 如果用戶不在資料庫中（Google OAuth 新用戶），需要從 session 中取得資訊
    if (!user) {
      console.warn("[Auth] User not found in DB but session exists:", {
        openId: sessionUserId,
        sessionName: session.name,
        timestamp: new Date().toISOString(),
      });
      // 嘗試從 session 中創建用戶（如果 session 中有足夠資訊）
      if (session.name) {
        console.log("[Auth] Attempting to create user from session data");
        try {
          await db.upsertUser({
            openId: sessionUserId,
            name: session.name,
            loginMethod: "google",
            lastSignedIn: signedInAt,
          });
          user = await db.getUserByOpenId(sessionUserId);
          if (user) {
            console.log("[Auth] User created from session data:", user.id);
          }
        } catch (error) {
          console.error("[Auth] Failed to create user from session:", error);
        }
      }
      
      if (!user) {
        throw ForbiddenError("User not found in database");
      }
    }

    // 只在開發環境或首次認證時輸出日誌，避免輪詢時產生大量日誌
    if (process.env.NODE_ENV !== 'production' || !global._authLogCount) {
      global._authLogCount = 0;
    }
    global._authLogCount = (global._authLogCount || 0) + 1;
    // 每 100 次認證才輸出一次日誌，減少日誌量
    if (global._authLogCount % 100 === 0) {
      console.log(`[Auth] Authenticated user (${global._authLogCount} requests):`, { id: user.id, openId: user.openId, name: user.name });
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
