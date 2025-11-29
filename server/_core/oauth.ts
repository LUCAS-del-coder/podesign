import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { googleOAuth } from "./googleOAuth";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Google OAuth 授權端點
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    const state = getQueryParam(req, "state") || "";
    const authUrl = googleOAuth.getAuthorizationUrl(state);
    res.redirect(302, authUrl);
  });

  // Google OAuth 回調端點
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[GoogleOAuth] Authorization error:", error);
      res.redirect(302, `/?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      // 交換授權碼獲取 access token
      const tokenResponse = await googleOAuth.exchangeCodeForToken(code);

      // 使用 access token 獲取用戶資訊
      const userInfo = await googleOAuth.getUserInfo(tokenResponse.access_token);

      if (!userInfo.id) {
        res.status(400).json({ error: "Google user ID missing from user info" });
        return;
      }

      // 儲存或更新用戶資訊到資料庫
      const existingUser = await db.getUserByOpenId(userInfo.id);
      await db.upsertUser({
        openId: userInfo.id, // 使用 Google ID 作為 openId
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // 建立 session token
      const sessionToken = await googleOAuth.createSessionToken(userInfo.id, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // 設定 cookie
      const cookieOptions = getSessionCookieOptions(req);
      console.log("[GoogleOAuth] Setting cookie with options:", {
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        path: cookieOptions.path,
        hostname: req.hostname,
        protocol: req.protocol,
        forwardedProto: req.headers["x-forwarded-proto"],
      });
      
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      
      console.log("[GoogleOAuth] User authenticated successfully:", {
        openId: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        isNewUser: !existingUser,
        userId: existingUser?.id || "new",
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[GoogleOAuth] Callback failed", error);
      res.status(500).json({ 
        error: "Google OAuth callback failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
