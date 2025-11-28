# Railway 環境變數設定指南

## 在 Railway 設定環境變數的步驟

1. 在 Railway Dashboard 中，點擊你的專案
2. 點擊你的服務（Service）
3. 進入 **"Variables"** 標籤頁
4. 點擊 **"New Variable"** 或 **"Raw Editor"** 來批量添加

## 必要環境變數（必須設定）

### 1. 資料庫連接
```
DATABASE_URL=mysql://user:password@host:port/database
```
**如何取得：**
- 在 Railway 專案中點擊 **"New"** → **"Database"** → **"MySQL"**
- Railway 會自動建立資料庫
- 複製資料庫的連接字串（Connection URL）貼到這裡

### 2. JWT 認證密鑰
```
JWT_SECRET=你的強隨機字串
```
**如何產生：**
- 可以使用線上工具：https://randomkeygen.com/
- 或執行：`openssl rand -base64 32`
- 建議至少 32 字元的隨機字串

### 3. Google OAuth 設定
```
GOOGLE_CLIENT_ID=你的-google-client-id
GOOGLE_CLIENT_SECRET=你的-google-client-secret
GOOGLE_REDIRECT_URI=https://你的網域/api/oauth/callback
```
**如何取得：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google+ API**
4. 前往 **Credentials** → **Create Credentials** → **OAuth client ID**
5. 應用程式類型選擇 **Web application**
6. 授權的重新導向 URI 設定為：`https://你的網域/api/oauth/callback`
7. 複製 **Client ID** 和 **Client Secret**

**注意：** 如果是本地開發，可以使用 `http://localhost:3000/api/oauth/callback`

### 4. OpenAI API（語音轉錄）
```
OPENAI_API_KEY=你的-openai-api-key
```
**如何取得：**
1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 登入或註冊帳號
3. 前往 **API Keys** 頁面
4. 建立新的 API Key
5. 複製並妥善保存（只會顯示一次）

### 6. ListenHub TTS API
```
LISTENHUB_API_KEY=你的-listenhub-api-key
```
**如何取得：**
- 前往 ListenHub 平台註冊並取得 API Key
- 如果沒有，可以暫時留空（但 TTS 功能會無法使用）

## 選用環境變數（可選）

### HeyGen API（影片生成功能）
```
HEYGEN_API_KEY=你的-heygen-api-key
```
- 如果不需要影片生成功能，可以不設定

### Kling AI API（影片生成功能）
```
KLING_AI_ACCESS_KEY=你的-kling-access-key
KLING_AI_SECRET_KEY=你的-kling-secret-key
```
- 如果不需要影片生成功能，可以不設定

### 前端顯示設定（選用）
```
VITE_APP_TITLE=Podcast Maker
VITE_APP_LOGO=https://example.com/logo.png
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

## 快速設定檢查清單

在 Railway Variables 中確認以下變數都已設定：

### 必要變數 ✓
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `OPENAI_API_KEY`
- [ ] `LISTENHUB_API_KEY`

### 選用變數（視需求）
- [ ] `HEYGEN_API_KEY`
- [ ] `KLING_AI_ACCESS_KEY`
- [ ] `KLING_AI_SECRET_KEY`
- [ ] `VITE_APP_TITLE`
- [ ] `VITE_APP_LOGO`

## 設定完成後的步驟

1. **儲存所有環境變數**：Railway 會自動重新部署
2. **等待部署完成**：在 Deployments 標籤查看建置進度
3. **執行資料庫遷移**：
   ```bash
   # 使用 Railway CLI
   railway run pnpm db:push
   
   # 或直接在 Railway Dashboard 的服務中執行
   ```
4. **測試應用**：訪問 Railway 提供的網域

## 常見問題

### Q: 如何知道哪些變數是必要的？
A: 如果應用啟動失敗，查看 Railway 日誌會顯示缺少哪些環境變數。

### Q: 環境變數設定後需要重新部署嗎？
A: Railway 會自動偵測環境變數變更並重新部署。

### Q: 如何測試環境變數是否正確？
A: 部署完成後，訪問應用首頁。如果出現錯誤，查看 Railway 日誌。

### Q: 找不到某些 API Key 怎麼辦？
A: 可以先設定為空字串或暫時註解掉相關功能，等取得 API Key 後再補上。

## 安全提示

⚠️ **重要：**
- 不要在程式碼中硬編碼 API Key
- 不要將 `.env` 檔案推送到 GitHub
- 定期輪換 API Key
- 使用 Railway 的 Variables 功能管理敏感資訊

