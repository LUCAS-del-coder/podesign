# Railway 部署指南

## 前置準備

1. **GitHub 帳號**：確保程式碼已推送到 GitHub
2. **Railway 帳號**：前往 [railway.app](https://railway.app) 註冊/登入
3. **環境變數值**：準備好所有需要的 API Key 和設定值

## 部署步驟

### 1. 在 Railway 建立新專案

1. 登入 Railway Dashboard
2. 點擊 **"New Project"**
3. 選擇 **"Deploy from GitHub repo"**
4. 選擇你的 `podcast-maker` repository
5. Railway 會自動偵測 `Dockerfile` 並開始建置

### 2. 設定環境變數

在 Railway 專案的 **Variables** 標籤頁中，新增以下環境變數：

#### 必要環境變數

```bash
# 資料庫連接（Railway 可自動建立 MySQL）
DATABASE_URL=mysql://user:password@host:port/database

# JWT 認證密鑰（請使用強隨機字串）
JWT_SECRET=your-strong-random-secret-key-here

# Manus OAuth 設定
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth

# 擁有者資訊
OWNER_OPEN_ID=your-manus-open-id
OWNER_NAME=your-name

# Manus 內建 API
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# ListenHub TTS API
LISTENHUB_API_KEY=your-listenhub-api-key
```

#### 選用環境變數

```bash
# HeyGen API（影片生成功能）
HEYGEN_API_KEY=your-heygen-api-key

# Kling AI API（影片生成功能）
KLING_AI_ACCESS_KEY=your-kling-access-key
KLING_AI_SECRET_KEY=your-kling-secret-key

# 前端環境變數（選用）
VITE_APP_LOGO=your-logo-url
VITE_APP_TITLE=Podcast Maker
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### 3. 設定資料庫（如果還沒有）

1. 在 Railway 專案中點擊 **"New"** → **"Database"** → **"MySQL"**
2. Railway 會自動建立 MySQL 資料庫
3. 複製資料庫連接字串到 `DATABASE_URL` 環境變數

### 4. 執行資料庫遷移

部署後，需要在 Railway 的服務中執行資料庫遷移：

1. 在 Railway 專案中，點擊你的服務
2. 進入 **"Deployments"** 標籤
3. 點擊最新的部署，然後進入 **"View Logs"**
4. 或者使用 Railway CLI：

```bash
# 安裝 Railway CLI
npm i -g @railway/cli

# 登入
railway login

# 連結專案
railway link

# 執行遷移
railway run pnpm db:push
```

### 5. 設定網域（選用）

1. 在 Railway 專案中，點擊你的服務
2. 進入 **"Settings"** → **"Networking"**
3. 點擊 **"Generate Domain"** 或 **"Custom Domain"**
4. Railway 會自動設定 HTTPS

### 6. 驗證部署

部署完成後，測試以下功能：

- ✅ 訪問首頁（應顯示登入頁面）
- ✅ 使用 Manus OAuth 登入
- ✅ 提交 YouTube URL 測試下載
- ✅ 檢查日誌確認沒有錯誤

## 故障排除

### 建置失敗

- 檢查 Railway 建置日誌
- 確認 `Dockerfile` 語法正確
- 確認 `package.json` 中的依賴都正確

### 應用啟動失敗

- 檢查環境變數是否全部設定
- 檢查 `DATABASE_URL` 是否正確
- 查看 Railway 日誌找出錯誤訊息

### 資料庫連接失敗

- 確認 `DATABASE_URL` 格式正確
- 確認資料庫服務正在運行
- 檢查資料庫是否允許外部連接

### YouTube 下載失敗

- 確認 `@distube/ytdl-core` 已正確安裝
- 檢查網路連接
- 查看服務日誌確認錯誤訊息

## 監控與維護

### 查看日誌

在 Railway Dashboard 中：
1. 選擇你的服務
2. 進入 **"Deployments"** → 選擇最新部署
3. 點擊 **"View Logs"** 查看即時日誌

### 重新部署

- **自動部署**：每次推送到 GitHub 主分支會自動觸發部署
- **手動部署**：在 Railway Dashboard 中點擊 **"Redeploy"**

### 更新環境變數

1. 在 **Variables** 標籤頁修改
2. Railway 會自動重新部署

## 成本估算

Railway 免費方案包含：
- $5 免費額度/月
- 足夠運行一個小型應用
- 超出後按使用量計費

建議：
- 監控使用量避免超出預算
- 設定使用量警告
- 考慮升級到付費方案以獲得更多資源

## 支援

如有問題，請查看：
- Railway 官方文件：https://docs.railway.app
- 專案 GitHub Issues
- Railway Discord 社群

