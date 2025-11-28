# 部署說明

Manus 的「發布」環境僅提供純 Node.js Runtime，因此我們已改寫程式碼，改用 **純 JavaScript** 的影音處理流程（`@distube/ytdl-core` + 內建 `@ffmpeg-installer/ffmpeg` 二進位）來下載與剪輯 YouTube 音訊。現在部署時 **不再需要系統層級的 Python / yt-dlp / ffmpeg**，只要支援 Node.js 22 即可。為了得到最穩定的效果，仍建議使用支援 Docker 的平台（Railway 仍會使用 `Dockerfile` 建置）。

## 必要依賴

- **Node.js 22+**
- **pnpm 10+**
- 影片下載：`@distube/ytdl-core`（專案依賴自動安裝）
- 音訊剪輯：`@ffmpeg-installer/ffmpeg`（跨平台二進位隨套件提供）

## 推薦部署平台

### 1. Railway（推薦）

Railway 原生支援 Docker，部署簡單快速。

**步驟**：

1. 在 [Railway](https://railway.app/) 建立新專案
2. 連接 GitHub 儲存庫
3. Railway 會自動偵測 `Dockerfile` 並建置
4. 設定環境變數（參考下方「環境變數」章節）
5. 部署完成

**優點**：
- 自動偵測 Dockerfile
- 免費額度充足
- 部署速度快
- 內建 PostgreSQL/MySQL 支援

### 2. Render

Render 也支援 Docker 部署，並提供免費方案。

**步驟**：

1. 在 [Render](https://render.com/) 建立新 Web Service
2. 連接 GitHub 儲存庫
3. 選擇 "Docker" 作為環境
4. Render 會自動使用 `render.yaml` 配置
5. 設定環境變數
6. 部署完成

**優點**：
- 免費方案可用
- 自動 SSL 憑證
- 支援自訂網域

### 3. Fly.io

Fly.io 提供全球分散式部署，適合需要低延遲的應用。

**步驟**：

1. 安裝 Fly CLI：`curl -L https://fly.io/install.sh | sh`
2. 登入：`fly auth login`
3. 在專案目錄執行：`fly launch`
4. 設定環境變數：`fly secrets set KEY=VALUE`
5. 部署：`fly deploy`

**優點**：
- 全球分散式部署
- 免費額度包含 3 個小型應用
- 支援自動擴展

## 環境變數

部署時需要設定以下環境變數：

```bash
# 資料庫
DATABASE_URL=mysql://user:password@host:port/database

# JWT 認證
JWT_SECRET=your-jwt-secret

# Manus OAuth
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth

# 擁有者資訊
OWNER_OPEN_ID=your-open-id
OWNER_NAME=your-name

# Manus 內建 API
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# ListenHub TTS API
LISTENHUB_API_KEY=your-listenhub-api-key

# HeyGen API（選用）
HEYGEN_API_KEY=your-heygen-api-key

# Kling AI API（選用）
KLING_AI_ACCESS_KEY=your-kling-access-key
KLING_AI_SECRET_KEY=your-kling-secret-key
```

## 本地 Docker 測試

在部署前，可以先在本地測試 Docker 映像：

```bash
# 建置映像
docker build -t podcast-maker .

# 執行容器
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_SECRET="your-jwt-secret" \
  # ... 其他環境變數
  podcast-maker

# 訪問應用
open http://localhost:3000
```

## 驗證部署

部署完成後，請測試以下功能：

1. ✅ 使用者可以登入
2. ✅ 可以提交 YouTube URL
3. ✅ YouTube 影片可以成功下載
4. ✅ 音訊轉錄正常運作
5. ✅ Podcast 音檔成功生成
6. ✅ 可以播放和下載 Podcast

## 故障排除

### YouTube 下載失敗

**問題**：tRPC 回傳「YouTube 影片下載失敗」或 log 出現 `Failed to find audio formats`

**解決方案**：
- 確認伺服器可連線到 YouTube（Railway 專案需允許 `https://www.youtube.com`）
- 更新到最新版本的 `@distube/ytdl-core`
- 重新測試 `pnpm test --filter youtube`（如有自訂測試）

### ffmpeg 相關錯誤

**問題**：音訊剪輯或重製 podcast 精華片段時失敗

**解決方案**：
- 確認 `node -e "console.log(require('@ffmpeg-installer/ffmpeg').path)"` 能輸出可執行路徑
- Railway Docker 映像中不用再安裝系統 ffmpeg，但仍須允許執行二進位
- 如果錯誤訊息為 `EACCES`，請確認檔案系統允許 `/tmp` 讀寫

### 資料庫連接失敗

**問題**：應用啟動失敗，錯誤訊息提到資料庫

**解決方案**：
- 檢查 `DATABASE_URL` 環境變數是否正確
- 確認資料庫伺服器允許外部連接
- 檢查資料庫憑證是否正確

## 效能優化建議

1. **使用 CDN**：將靜態資源（圖片、CSS、JS）託管到 CDN
2. **資料庫索引**：為常用查詢欄位建立索引
3. **快取策略**：使用 Redis 快取常用資料
4. **音檔壓縮**：已內建音訊壓縮，確保不超過 16MB 限制

## 監控與日誌

建議設定以下監控：

1. **應用健康檢查**：定期檢查 `/` 端點
2. **錯誤追蹤**：使用 Sentry 或類似服務
3. **效能監控**：使用 New Relic 或 DataDog
4. **日誌聚合**：使用 Logtail 或 Papertrail

## 支援

如有部署問題，請查看：

1. 專案 GitHub Issues
2. 部署平台的官方文件
3. 聯繫專案維護者
