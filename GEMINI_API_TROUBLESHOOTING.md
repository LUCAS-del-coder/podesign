# Gemini API 故障排除指南

## 問題症狀

所有 Gemini 模型都返回 404 錯誤：
```
models/gemini-1.5-flash is not found for API version v1beta
models/gemini-1.5-pro is not found for API version v1beta
```

## 可能的原因

### 1. API Key 未正確設定

**檢查步驟：**
1. 前往 Railway 專案的環境變數設定
2. 確認 `GOOGLE_GEMINI_API_KEY` 已設定
3. 確認 API Key 沒有多餘的空格或換行符號

**如何獲取 API Key：**
1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登入您的 Google 帳號
3. 點擊「Create API Key」
4. 複製 API Key（格式類似：`AIzaSy...`）
5. 在 Railway 中設定為 `GOOGLE_GEMINI_API_KEY`

### 2. API Key 未啟用 Gemini API

**檢查步驟：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案
3. 前往「API 和服務」>「已啟用的 API」
4. 確認「Generative Language API」已啟用
5. 如果未啟用，點擊「啟用 API」

### 3. API Key 權限不足

**解決方法：**
1. 確保 API Key 有「Generative Language API」的存取權限
2. 如果使用服務帳號，確保服務帳號有正確的角色

### 4. 模型名稱或 API 版本不正確

系統會自動嘗試列出可用模型，但如果 API Key 無效，這個步驟也會失敗。

## 診斷步驟

### 步驟 1：檢查環境變數

在 Railway 的日誌中，應該會看到：
```
[LLM] Available models: ...
```

如果沒有看到這行，表示列出模型的 API 調用失敗，可能是 API Key 問題。

### 步驟 2：手動測試 API Key

您可以使用以下 curl 命令測試 API Key：

```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_API_KEY"
```

如果 API Key 正確，應該會返回模型列表。如果返回 401 或 403，表示 API Key 無效。

### 步驟 3：檢查 API 配額

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案
3. 前往「API 和服務」>「配額」
4. 確認「Generative Language API」有可用配額

## 解決方案

### 方案 1：重新生成 API Key

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 刪除舊的 API Key（如果有的話）
3. 建立新的 API Key
4. 在 Railway 中更新 `GOOGLE_GEMINI_API_KEY`

### 方案 2：啟用 API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 啟用「Generative Language API」
3. 等待幾分鐘讓變更生效
4. 重新部署應用程式

### 方案 3：檢查專案設定

1. 確認您使用的是正確的 Google Cloud 專案
2. 確認專案已啟用計費（某些 API 需要）
3. 確認 API Key 屬於正確的專案

## 臨時解決方案

如果 Gemini API 無法使用，系統會自動回退到傳統方式：
1. 下載 YouTube 影片音訊
2. 使用 AssemblyAI 轉錄
3. 使用 LLM 分析轉錄內容

但這需要 LLM 正常工作。如果 LLM 也失敗，請檢查 `GOOGLE_GEMINI_API_KEY` 設定。

## 聯絡支援

如果以上步驟都無法解決問題，請：
1. 檢查 Railway 日誌中的完整錯誤訊息
2. 確認 API Key 格式正確（應該以 `AIzaSy` 開頭）
3. 確認 API Key 沒有過期或被撤銷

