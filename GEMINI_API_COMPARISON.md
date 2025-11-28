# Gemini API 使用方法比較

## 研究結果

### 成功案例使用的方法

1. **使用官方 SDK（Python）**
   ```python
   import google.generativeai as genai
   genai.configure(api_key=os.environ['GOOGLE_API_KEY'])
   model = genai.GenerativeModel('gemini-1.5-pro-latest')
   ```

2. **模型名稱**
   - `gemini-1.5-pro-latest`（最新版本）
   - `gemini-2.5-pro`（較新版本）
   - `gemini-2.0-flash`（快速版本）

3. **API 端點**
   - 使用 `v1beta` API 版本
   - 端點格式：`v1beta/models/gemini-2.0-flash:generateContent`

### 我們目前使用的方法

1. **直接 REST API 調用（Node.js）**
   ```typescript
   const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${ENV.googleGeminiApiKey}`;
   ```

2. **模型名稱**
   - 嘗試：`gemini-1.5-flash`、`gemini-1.5-pro`
   - 問題：這些模型可能已過時或不可用

3. **API 端點**
   - 先嘗試 `v1`，失敗後嘗試 `v1beta`
   - 先列出可用模型，然後選擇

## 主要差異

### ✅ 我們做對的地方

1. **先列出可用模型**：這是正確的做法，可以確保使用正確的模型名稱
2. **錯誤處理**：有完整的錯誤處理和回退機制
3. **環境變數設定**：使用 `GOOGLE_GEMINI_API_KEY` 是正確的

### ❌ 可能的問題

1. **模型名稱過時**：
   - 我們使用 `gemini-1.5-flash`，但成功案例使用 `gemini-1.5-pro-latest` 或 `gemini-2.0-flash`
   - 建議：使用 `-latest` 後綴或更新版本的模型

2. **API 版本**：
   - 我們先嘗試 `v1`，但成功案例主要使用 `v1beta`
   - 建議：優先使用 `v1beta` API

3. **未使用官方 SDK**：
   - 我們直接調用 REST API，而不是使用 `@google/generative-ai` SDK
   - 這不是問題，但 SDK 可能更穩定

## 建議改進

### 方案 1：更新模型名稱（推薦）

使用更新的模型名稱，並優先使用 `v1beta` API：

```typescript
const modelNames = [
  { version: "v1beta", name: "gemini-2.0-flash" },
  { version: "v1beta", name: "gemini-1.5-pro-latest" },
  { version: "v1beta", name: "gemini-1.5-flash-latest" },
  { version: "v1", name: "gemini-1.5-pro-latest" },
];
```

### 方案 2：使用官方 SDK

安裝並使用 `@google/generative-ai` SDK：

```bash
pnpm add @google/generative-ai
```

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(ENV.googleGeminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
```

## 結論

我們的方法**基本正確**，但可能需要：
1. 更新模型名稱（使用 `-latest` 後綴或更新版本）
2. 優先使用 `v1beta` API
3. 考慮使用官方 SDK 以提高穩定性

