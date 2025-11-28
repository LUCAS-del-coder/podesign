# OpenAI API 連線問題診斷指南

## 問題描述

在 Railway 部署環境中，OpenAI Whisper API 可能出現 `ECONNRESET` 錯誤，表示連線在傳輸過程中被重置。

## 可能的原因

1. **Railway 網路環境限制**：某些網路環境可能無法穩定連接到 OpenAI API
2. **檔案太大**：大檔案上傳時間過長，導致連線超時
3. **OpenAI API 暫時不可用**：服務端問題
4. **IP 限制**：OpenAI 可能對某些 IP 範圍有連線限制

## 解決方案

### 方案 1：檢查 Railway 網路設定

1. 在 Railway Dashboard 中檢查服務的網路設定
2. 確認沒有防火牆或代理限制
3. 檢查 Railway 的服務狀態頁面：https://status.railway.app/

### 方案 2：使用較小的音訊檔案

- OpenAI Whisper API 限制檔案大小為 25MB
- 如果檔案接近限制，建議：
  - 選擇較短的影片（建議 40 分鐘以內）
  - 使用較低的音訊品質設定

### 方案 3：檢查 OpenAI API 狀態

1. 前往 OpenAI 狀態頁面：https://status.openai.com/
2. 確認 API 服務正常運行
3. 檢查是否有已知的連線問題

### 方案 4：使用其他部署平台

如果 Railway 的網路環境持續有問題，可以考慮：

1. **Render**：https://render.com/
   - 提供穩定的網路環境
   - 支援 Docker 部署

2. **Fly.io**：https://fly.io/
   - 全球分佈式部署
   - 可能提供更好的連線穩定性

3. **Vercel**：https://vercel.com/
   - 適合 Node.js 應用
   - 提供穩定的網路環境

### 方案 5：使用代理服務（進階）

如果必須使用 Railway，可以考慮：

1. 設定 HTTP 代理
2. 使用 VPN 或代理服務
3. 透過中間服務轉發請求

**注意**：這需要額外的設定和成本。

## 診斷步驟

### 1. 檢查日誌

查看 Railway 日誌，確認錯誤類型：
- `ECONNRESET`：連線重置
- `ETIMEDOUT`：連線超時
- `ENOTFOUND`：DNS 解析失敗

### 2. 測試連線

在 Railway 的 Shell 中測試連線：

```bash
curl -I https://api.openai.com/v1/models
```

如果無法連線，可能是 Railway 的網路限制。

### 3. 檢查檔案大小

確認音訊檔案大小：
- 如果超過 20MB，建議使用較短的影片
- 系統會自動檢查並拒絕超過 25MB 的檔案

## 臨時解決方案

如果問題持續，可以：

1. **重試**：系統會自動重試 5 次，請稍後再試
2. **使用文字輸入**：如果轉錄持續失敗，可以直接使用文字輸入功能
3. **本地測試**：在本地環境測試，確認功能正常

## 回報問題

如果問題持續，請提供以下資訊：

1. Railway 日誌的完整錯誤訊息
2. 音訊檔案大小
3. 錯誤發生的時間
4. Railway 服務的區域設定

## 相關文件

- [OpenAI Whisper API 文件](https://platform.openai.com/docs/guides/speech-to-text)
- [Railway 文件](https://docs.railway.app/)
- [部署指南](./DEPLOYMENT.md)

