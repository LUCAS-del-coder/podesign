# 語音轉錄 API 替代方案

除了 OpenAI Whisper API，還有許多其他語音轉錄服務可以使用。以下是各種選項的比較和實作指南。

## 推薦的替代方案

### 1. **Google Cloud Speech-to-Text** ⭐ 推薦

**優點：**
- 準確度高，支援多種語言
- 提供免費額度（每月 60 分鐘）
- 穩定的 API 連線
- 支援即時和批次轉錄
- 檔案大小限制較寬鬆（可達 60MB）

**缺點：**
- 需要 Google Cloud 帳號
- 設定較複雜

**價格：**
- 免費額度：每月前 60 分鐘
- 付費：$0.006/15 秒（約 $0.024/分鐘）

**實作難度：** ⭐⭐ (中等)

---

### 2. **Azure Speech Services** ⭐ 推薦

**優點：**
- 微軟提供的穩定服務
- 支援多種語言和方言
- 提供免費額度（每月 5 小時）
- 良好的中文支援

**缺點：**
- 需要 Azure 帳號
- 設定較複雜

**價格：**
- 免費額度：每月前 5 小時
- 付費：$1/小時

**實作難度：** ⭐⭐ (中等)

---

### 3. **Amazon Transcribe**

**優點：**
- AWS 生態系統整合
- 穩定的服務
- 支援批次處理

**缺點：**
- 需要 AWS 帳號
- 價格較高
- 中文支援可能不如 Google/Azure

**價格：**
- 免費額度：無
- 付費：$0.024/分鐘

**實作難度：** ⭐⭐⭐ (較複雜)

---

### 4. **AssemblyAI** ⭐ 簡單易用

**優點：**
- 簡單易用的 API
- 良好的文件
- 支援多種功能（說話者識別、情感分析等）
- 穩定的連線

**缺點：**
- 免費額度較少
- 價格較高

**價格：**
- 免費額度：每月 5 小時
- 付費：$0.00025/秒（約 $0.015/分鐘）

**實作難度：** ⭐ (簡單)

---

### 5. **Deepgram**

**優點：**
- 快速且準確
- 良好的開發者體驗
- 支援即時轉錄

**缺點：**
- 免費額度較少
- 價格較高

**價格：**
- 免費額度：每月 12,000 分鐘（僅限即時）
- 付費：$0.0043/分鐘

**實作難度：** ⭐ (簡單)

---

### 6. **Rev AI**

**優點：**
- 高準確度
- 支援多種語言

**缺點：**
- 價格較高
- 免費額度較少

**價格：**
- 免費額度：無
- 付費：$0.02/分鐘

**實作難度：** ⭐⭐ (中等)

---

### 7. **Hugging Face Inference API** (使用 Whisper 模型)

**優點：**
- 使用開源的 Whisper 模型
- 免費額度
- 不需要 API Key（可選）

**缺點：**
- 可能不如商業 API 穩定
- 免費額度有限

**價格：**
- 免費額度：有限
- 付費：按使用量計費

**實作難度：** ⭐⭐ (中等)

---

## 快速比較表

| 服務 | 免費額度 | 價格/分鐘 | 中文支援 | 連線穩定性 | 實作難度 |
|------|---------|----------|---------|-----------|---------|
| **OpenAI Whisper** | 無 | $0.006 | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Google Cloud** | 60分鐘/月 | $0.024 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Azure Speech** | 5小時/月 | $0.0167 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **AssemblyAI** | 5小時/月 | $0.015 | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Deepgram** | 12,000分鐘/月* | $0.0043 | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Amazon Transcribe** | 無 | $0.024 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

*僅限即時轉錄

---

## 實作建議

### 方案 A：使用 Google Cloud Speech-to-Text（推薦）

**原因：**
- 免費額度充足（60分鐘/月）
- 中文支援優秀
- 連線穩定
- 適合 Railway 部署

**實作步驟：**
1. 在 Google Cloud Console 建立專案
2. 啟用 Speech-to-Text API
3. 建立服務帳號並下載 JSON 金鑰
4. 安裝 `@google-cloud/speech` 套件
5. 修改 `voiceTranscription.ts` 使用 Google API

---

### 方案 B：使用 AssemblyAI（最簡單）

**原因：**
- API 簡單易用
- 文件清晰
- 連線穩定
- 實作快速

**實作步驟：**
1. 在 AssemblyAI 註冊帳號
2. 取得 API Key
3. 安裝 `assemblyai` 套件
4. 修改 `voiceTranscription.ts` 使用 AssemblyAI API

---

### 方案 C：使用 Azure Speech Services

**原因：**
- 免費額度充足（5小時/月）
- 中文支援優秀
- 微軟穩定服務

**實作步驟：**
1. 在 Azure Portal 建立資源
2. 取得 API Key 和區域
3. 安裝 `microsoft-cognitiveservices-speech-sdk` 套件
4. 修改 `voiceTranscription.ts` 使用 Azure API

---

## 實作範例：AssemblyAI

以下是一個簡單的實作範例：

```typescript
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export async function transcribeAudioWithAssemblyAI(
  audioUrl: string
): Promise<{ text: string; language: string }> {
  // 上傳音訊檔案
  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,
    language_code: 'zh', // 中文
  });

  return {
    text: transcript.text || '',
    language: transcript.language_code || 'zh',
  };
}
```

---

## 建議

考慮到 Railway 的連線問題，我建議：

1. **優先嘗試 AssemblyAI**：
   - 最簡單實作
   - 連線穩定
   - 免費額度足夠測試

2. **備選 Google Cloud**：
   - 免費額度最多
   - 中文支援最好
   - 適合長期使用

3. **如果預算充足，考慮 Deepgram**：
   - 速度最快
   - 準確度高
   - 連線最穩定

---

## 下一步

如果您想實作其中一個替代方案，我可以：
1. 修改 `voiceTranscription.ts` 支援新的 API
2. 更新環境變數設定
3. 更新文件

請告訴我您想使用哪個服務，我會幫您實作！

