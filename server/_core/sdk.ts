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
    
    // 嘗試驗證帳號密碼登入的 JWT
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(sessionCookie ?? "", secretKey, {
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
            return result[0];
          }
        }
      }
    } catch (error) {
      // 不是帳號密碼登入的 JWT，繼續嘗試 OAuth
    }
    
    // 驗證 session（支援帳號密碼和 Google OAuth）
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // 如果用戶不在資料庫中（Google OAuth 新用戶），需要從 session 中取得資訊
    if (!user && session) {
      // 從 session payload 中取得用戶資訊（Google OAuth 已在 callback 中儲存）
      // 這裡只需要確保用戶存在，如果不存在可能是 session 損壞
      console.warn("[Auth] User not found in DB but session exists:", sessionUserId);
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
