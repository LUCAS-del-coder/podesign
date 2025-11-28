# 遷移總結：從 Manus 改為獨立服務

## ✅ 已完成的修改

### 1. 語音轉錄服務
- **從**：Manus Forge API
- **改為**：OpenAI Whisper API
- **檔案**：`server/_core/voiceTranscription.ts`
- **環境變數**：`OPENAI_API_KEY`

### 2. OAuth 認證系統
- **從**：Manus OAuth
- **改為**：Google OAuth 2.0
- **檔案**：
  - `server/_core/googleOAuth.ts`（新建）
  - `server/_core/oauth.ts`（已更新）
  - `server/_core/sdk.ts`（已更新）
  - `client/src/pages/Login.tsx`（已添加 Google 登入按鈕）
- **環境變數**：
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`

### 3. 環境變數更新
- **移除**：
  - `VITE_APP_ID`
  - `OAUTH_SERVER_URL`
  - `VITE_OAUTH_PORTAL_URL`
  - `OWNER_OPEN_ID`
  - `OWNER_NAME`
  - `BUILT_IN_FORGE_API_URL`
  - `BUILT_IN_FORGE_API_KEY`
  - `VITE_FRONTEND_FORGE_API_KEY`
  - `VITE_FRONTEND_FORGE_API_URL`
- **新增**：
  - `OPENAI_API_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`

## 📋 現在需要的環境變數

### 必要變數
```bash
# 資料庫
DATABASE_URL=mysql://user:password@host:port/database

# JWT 認證
JWT_SECRET=your-strong-random-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth/callback

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# ListenHub TTS API
LISTENHUB_API_KEY=your-listenhub-api-key
```

### 選用變數
```bash
# HeyGen API（影片生成）
HEYGEN_API_KEY=your-heygen-api-key

# Kling AI API（影片生成）
KLING_AI_ACCESS_KEY=your-kling-access-key
KLING_AI_SECRET_KEY=your-kling-secret-key
```

## 🔧 設定 Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google+ API**
4. 前往 **Credentials** → **Create Credentials** → **OAuth client ID**
5. 應用程式類型選擇 **Web application**
6. 授權的重新導向 URI：
   - 生產環境：`https://你的網域/api/oauth/callback`
   - 本地開發：`http://localhost:3000/api/oauth/callback`
7. 複製 **Client ID** 和 **Client Secret**

## 🔧 設定 OpenAI API

1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 登入或註冊帳號
3. 前往 **API Keys** 頁面
4. 建立新的 API Key
5. 複製並妥善保存

## 🚀 部署步驟

1. **更新環境變數**：在 Railway 的 Variables 中設定所有必要變數
2. **重新部署**：Railway 會自動重新建置
3. **測試功能**：
   - 測試 Google 登入
   - 測試 YouTube 影片轉錄（使用 OpenAI Whisper）
   - 測試 Podcast 生成（使用 ListenHub）

## 📝 注意事項

- **Google OAuth 回調 URL** 必須與 Google Cloud Console 中設定的完全一致
- **OpenAI API Key** 有使用限制，請注意用量
- **ListenHub API** 仍需要設定才能生成 Podcast 音檔
- 帳號密碼登入功能仍然可用（與 Google OAuth 並存）

## 🐛 故障排除

### Google OAuth 登入失敗
- 檢查 `GOOGLE_REDIRECT_URI` 是否與 Google Cloud Console 中設定的完全一致
- 確認 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 正確
- 檢查 Google Cloud Console 中是否已啟用 Google+ API

### 語音轉錄失敗
- 確認 `OPENAI_API_KEY` 已正確設定
- 檢查 API Key 是否有足夠的額度
- 確認音訊檔案大小不超過 25MB（OpenAI Whisper 限制）

### 資料庫連接失敗
- 確認 `DATABASE_URL` 格式正確
- 檢查資料庫服務是否正在運行

