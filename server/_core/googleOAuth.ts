/**
 * Google OAuth 服務
 * 處理 Google OAuth 2.0 認證流程
 */

import axios from "axios";
import { SignJWT } from "jose";
import { ENV } from "./env";
import { ONE_YEAR_MS } from "@shared/const";

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string; // Google user ID (作為 openId)
  email: string;
  verified_email: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

class GoogleOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || "";
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn(
        "[GoogleOAuth] Warning: Google OAuth credentials not fully configured"
      );
    }
  }

  /**
   * 獲取 Google OAuth 授權 URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * 使用授權碼交換 access token
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        "https://oauth2.googleapis.com/token",
        {
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: "authorization_code",
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("[GoogleOAuth] Token exchange failed:", error.response?.data || error.message);
      throw new Error(
        `Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * 使用 access token 獲取用戶資訊
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("[GoogleOAuth] Get user info failed:", error.response?.data || error.message);
      throw new Error(
        `Failed to get user info: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * 建立 session token (JWT)
   */
  async createSessionToken(
    googleId: string,
    options: { name?: string; expiresInMs?: number } = {}
  ): Promise<string> {
    const secretKey = new TextEncoder().encode(ENV.cookieSecret);
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

    return new SignJWT({
      openId: googleId,
      name: options.name || "",
      loginMethod: "google",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }
}

export const googleOAuth = new GoogleOAuthService();

