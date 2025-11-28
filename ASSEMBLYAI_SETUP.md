# AssemblyAI 設定指南

## 什麼是 AssemblyAI？

AssemblyAI 是一個專業的語音轉錄服務，提供：
- 高準確度的語音轉文字
- 穩定的 API 連線（適合 Railway 部署）
- 免費額度：每月 5 小時
- 支援多種語言，包括中文

## 註冊和取得 API Key

### 步驟 1：註冊帳號

1. 前往 [AssemblyAI 官網](https://www.assemblyai.com/)
2. 點擊 **"Get Started"** 或 **"Sign Up"**
3. 使用 Email 註冊帳號（或使用 Google/GitHub 登入）

### 步驟 2：取得 API Key

1. 登入後，前往 [Dashboard](https://www.assemblyai.com/app/)
2. 在左側選單中找到 **"API Keys"** 或直接查看 Dashboard 首頁
3. 您會看到您的 **API Key**（格式類似：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
4. 點擊 **"Copy"** 複製 API Key

**重要：** API Key 只會顯示一次，請妥善保存！

## 在 Railway 設定環境變數

1. 在 Railway Dashboard 中，點擊您的專案
2. 點擊您的服務（Service）
3. 進入 **"Variables"** 標籤頁
4. 點擊 **"New Variable"**
5. 設定：
   - **Key**: `ASSEMBLYAI_API_KEY`
   - **Value**: 您剛才複製的 API Key
6. 點擊 **"Add"**

## 驗證設定

部署完成後，檢查 Railway 日誌，應該會看到：
```
[Startup] ASSEMBLYAI_API_KEY: Set (hidden)
```

如果看到 `NOT SET`，請確認環境變數已正確設定。

## 免費額度

AssemblyAI 提供：
- **免費額度**：每月 5 小時轉錄時間
- **付費方案**：$0.00025/秒（約 $0.015/分鐘）

對於大多數使用場景，免費額度已經足夠。

## 與 OpenAI 的差異

### 優點
- ✅ 更穩定的連線（適合 Railway）
- ✅ 免費額度充足（5小時/月）
- ✅ 自動處理輪詢（不需要手動等待）
- ✅ 支援直接使用 URL（不需要下載檔案）

### 注意事項
- 檔案大小限制：建議不超過 25MB
- 處理時間：較長的音訊可能需要幾分鐘處理
- 語言支援：支援中文，但可能需要明確指定 `language_code: 'zh'`

## 故障排除

### 問題：`ASSEMBLYAI_API_KEY is not set`

**解決方案：**
1. 確認在 Railway 中已設定環境變數
2. 確認變數名稱正確（大小寫敏感）
3. 重新部署服務

### 問題：`Transcription failed`

**可能原因：**
1. API Key 無效或過期
2. 檔案格式不支援
3. 檔案太大

**解決方案：**
1. 檢查 API Key 是否正確
2. 確認音訊格式為 MP3、WAV、M4A 等
3. 嘗試較小的檔案測試

### 問題：轉錄結果為空

**可能原因：**
1. 音訊檔案沒有語音內容
2. 音訊品質太差
3. 語言設定不正確

**解決方案：**
1. 確認音訊檔案包含語音
2. 檢查音訊品質
3. 明確指定語言代碼（如 `zh` 表示中文）

## 相關文件

- [AssemblyAI 官方文件](https://www.assemblyai.com/docs)
- [AssemblyAI API 參考](https://www.assemblyai.com/docs/api-reference)
- [Railway 環境變數設定](./RAILWAY_ENV_SETUP.md)

