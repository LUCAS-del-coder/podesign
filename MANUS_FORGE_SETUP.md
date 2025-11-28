# Manus Forge API 設定指南

## 概述

Manus Forge API 是 Manus 平台提供的儲存服務，如果您已經有 Manus 帳號，可以使用這個服務來儲存音訊和圖片檔案。

**注意：** 系統會自動選擇 Storage 方案：
- 如果配置了 **AWS S3**，系統會優先使用 S3
- 如果**沒有配置 AWS S3**，系統會自動使用 Manus Forge API

## 前置需求

1. **Manus 帳號**：需要有效的 Manus 帳號
2. **Forge API Key**：需要從 Manus 平台取得 API Key

## 設定步驟

### 1. 取得 Manus Forge API Key

1. 登入 [Manus 平台](https://manus.im/)
2. 前往 **開發者設定** 或 **API 管理** 頁面
3. 找到 **Forge API** 相關設定
4. 建立或複製您的 **Forge API Key**
5. **重要：** API Key 只會顯示一次，請妥善保存

### 2. 在 Railway 設定環境變數

在 Railway 專案的 **Variables** 標籤頁中，新增以下環境變數：

```bash
# Manus Forge API 配置
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=你的-manus-forge-api-key
```

**重要提示：**
- 如果您**同時配置了 AWS S3 和 Manus Forge API**，系統會優先使用 AWS S3
- 如果您**只想使用 Manus Forge API**，請**不要設定** AWS S3 相關環境變數：
  - 不要設定 `AWS_ACCESS_KEY_ID`
  - 不要設定 `AWS_SECRET_ACCESS_KEY`
  - 不要設定 `AWS_REGION`
  - 不要設定 `AWS_S3_BUCKET`

### 3. 驗證設定

設定完成後，重新部署應用程式。如果設定正確，您應該能夠：

1. ✅ 成功上傳 YouTube 音訊檔案
2. ✅ 成功轉錄音訊
3. ✅ 成功生成 Podcast

## 使用方式

### 自動選擇機制

系統會自動判斷使用哪個 Storage 方案：

```typescript
// 系統會檢查是否配置了 AWS S3
if (isS3Configured()) {
  // 使用 AWS S3
} else {
  // 使用 Manus Forge API
}
```

### 檢查當前使用的 Storage

如果遇到 Storage 相關錯誤，可以查看 Railway 日誌來確認：

- **使用 AWS S3**：錯誤訊息會包含 "AWS S3"
- **使用 Manus Forge API**：錯誤訊息會包含 "Storage proxy" 或 "BUILT_IN_FORGE"

## 故障排除

### 錯誤：Storage proxy credentials missing

**原因**：缺少 Manus Forge API 配置

**解決方案**：
1. 確認已設定 `BUILT_IN_FORGE_API_URL`
2. 確認已設定 `BUILT_IN_FORGE_API_KEY`
3. 確認 API Key 正確且有效

### 錯誤：Storage upload failed (401 Unauthorized)

**原因**：API Key 無效或過期

**解決方案**：
1. 檢查 API Key 是否正確複製（沒有多餘空格）
2. 前往 Manus 平台重新生成 API Key
3. 更新 Railway 環境變數

### 錯誤：Storage upload failed (403 Forbidden)

**原因**：API Key 沒有足夠權限

**解決方案**：
1. 檢查 Manus 帳號的權限設定
2. 確認 Forge API 功能已啟用
3. 聯繫 Manus 支援確認帳號狀態

### 系統仍使用 AWS S3 而不是 Manus Forge API

**原因**：同時配置了 AWS S3 和 Manus Forge API

**解決方案**：
- **選項 1**：移除所有 AWS S3 環境變數，只保留 Manus Forge API
- **選項 2**：保留 AWS S3 配置（系統會優先使用 S3）

## 與 AWS S3 的比較

| 特性 | Manus Forge API | AWS S3 |
|------|----------------|--------|
| **設定複雜度** | 簡單（只需 API Key） | 中等（需要建立 Bucket 和 IAM） |
| **成本** | 取決於 Manus 方案 | 按使用量計費（通常 $1-5/月） |
| **靈活性** | 受限於 Manus 平台 | 完全控制 |
| **適用場景** | 已有 Manus 帳號 | 需要完全控制或自架部署 |

## 遷移指南

### 從 Manus Forge API 遷移到 AWS S3

1. 設定 AWS S3 環境變數
2. 系統會自動切換到 S3
3. 舊的 Manus Forge API 配置可以保留（作為備用）

### 從 AWS S3 遷移到 Manus Forge API

1. 移除所有 AWS S3 環境變數：
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET`
2. 設定 Manus Forge API 環境變數
3. 系統會自動切換到 Manus Forge API

## 安全提示

⚠️ **重要：**
- 不要在程式碼中硬編碼 API Key
- 不要將 API Key 推送到 GitHub
- 定期檢查 API Key 的使用情況
- 如果 API Key 洩露，立即在 Manus 平台重新生成

## 常見問題

### Q: 我可以同時使用兩個 Storage 方案嗎？

A: 可以，但系統會優先使用 AWS S3。如果您想強制使用 Manus Forge API，請移除 AWS S3 配置。

### Q: Manus Forge API 有儲存限制嗎？

A: 限制取決於您的 Manus 方案。請查看 Manus 平台的方案說明。

### Q: 如何知道當前使用的是哪個 Storage？

A: 查看 Railway 日誌。如果上傳成功，表示 Storage 配置正確。如果出現錯誤，錯誤訊息會顯示使用的是哪個方案。

### Q: 可以混合使用嗎？（部分檔案用 S3，部分用 Manus）

A: 目前不支援。系統會統一使用一個 Storage 方案。

## 取得協助

如果遇到問題：

1. **檢查 Railway 日誌**：查看詳細錯誤訊息
2. **確認環境變數**：確保所有必要的變數都已設定
3. **聯繫 Manus 支援**：如果是 Manus 平台相關問題
4. **查看文件**：參考 [AWS_S3_SETUP.md](./AWS_S3_SETUP.md) 了解 AWS S3 設定

