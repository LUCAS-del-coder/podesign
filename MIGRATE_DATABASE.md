# 資料庫遷移指南

## 方法 1：使用 Railway CLI（推薦）

### 步驟 1：安裝 Railway CLI
```bash
npm i -g @railway/cli
```

### 步驟 2：登入 Railway
```bash
railway login
```
這會開啟瀏覽器讓你登入 Railway 帳號。

### 步驟 3：連結專案
```bash
railway link
```
選擇你的 Railway 專案（podcast-maker）。

### 步驟 4：執行資料庫遷移
```bash
railway run pnpm db:push
```

這個命令會：
- 讀取 `drizzle/schema.ts` 中的資料庫結構
- 直接同步到 Railway 的 MySQL 資料庫
- 建立所有必要的資料表

## 方法 2：在 Railway Dashboard 執行

### 步驟 1：進入 Shell
1. 在 Railway Dashboard 中，點擊 `podcast-maker` 服務
2. 點擊 **"Deployments"** 標籤
3. 點擊最新的部署
4. 點擊 **"Shell"** 按鈕（如果有的話）

### 步驟 2：執行遷移命令
在 Shell 中執行：
```bash
pnpm db:push
```

## 方法 3：使用 Railway 的 Deploy 功能

如果 Railway 支援在部署時自動執行遷移，可以在 `railway.json` 或部署設定中添加。

## 驗證遷移是否成功

遷移完成後，你應該會看到類似這樣的訊息：
```
✓ Migration completed successfully
```

或者如果資料表已存在：
```
✓ Tables are up to date
```

## 故障排除

### 錯誤：DATABASE_URL is required
- 確認在 Railway Variables 中已設定 `DATABASE_URL`
- 確認值是正確的 MySQL 連接字串

### 錯誤：Connection refused
- 確認 MySQL 服務正在運行
- 確認 `DATABASE_URL` 中的主機和端口正確

### 錯誤：Access denied
- 確認 `DATABASE_URL` 中的用戶名和密碼正確
- 確認 MySQL 用戶有足夠的權限

## 需要建立的資料表

遷移會建立以下資料表：
- `users` - 用戶資料
- `podcast_tasks` - Podcast 任務
- `podcast_highlights` - 精華片段
- `voice_preferences` - 聲音偏好設定
- `avatar_video_tasks` - 虛擬主播影片任務

## 注意事項

- 遷移不會刪除現有資料
- 如果資料表已存在，會更新結構以符合 schema
- 建議在執行遷移前備份資料庫（如果已有資料）

