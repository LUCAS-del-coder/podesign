# 代碼改進建議

## 🔴 高優先級（影響功能或穩定性）

### 1. YouTube 直接分析仍使用 REST API
**位置**: `server/youtubeService.ts:422-548`

**問題**:
- `analyzeYoutubeUrlDirectly` 仍使用直接 REST API 調用
- 與 `server/_core/llm.ts` 中的 SDK 實現不一致
- 可能遇到相同的模型名稱問題

**建議**:
```typescript
// 改用官方 SDK，與 llm.ts 保持一致
import { GoogleGenerativeAI } from "@google/generative-ai";

async function analyzeYoutubeUrlDirectly(youtubeUrl: string) {
  const client = new GoogleGenerativeAI(ENV.googleGeminiApiKey);
  const model = client.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
  });
  
  const response = await model.generateContent(prompt);
  // ...
}
```

### 2. 環境變數驗證不足
**位置**: `server/_core/index.ts:31-38`

**問題**:
- 只檢查環境變數是否存在，不驗證格式
- 缺少啟動時的完整驗證

**建議**:
```typescript
// 在啟動時驗證所有必需的環境變數
function validateEnv() {
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
  };
  
  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
    
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### 3. 錯誤處理不一致
**位置**: 多處

**問題**:
- 有些地方只記錄錯誤，不拋出
- 錯誤訊息不夠詳細
- 缺少統一的錯誤處理機制

**建議**:
- 建立統一的錯誤處理中間件
- 使用結構化錯誤類型
- 記錄完整的錯誤堆疊

## 🟡 中優先級（影響可維護性或性能）

### 4. 日誌系統
**位置**: 全專案（227 個 console.log/warn/error）

**問題**:
- 大量使用 `console.log`，缺乏結構化
- 沒有日誌級別控制
- 生產環境可能產生過多日誌

**建議**:
```typescript
// 使用結構化日誌庫（如 winston 或 pino）
import logger from './logger';

logger.info('[YouTube] 開始處理', { url: youtubeUrl });
logger.error('[YouTube] 處理失敗', { error: error.message, stack: error.stack });
```

### 5. 代碼重複
**位置**: `server/youtubeService.ts` 和 `server/_core/llm.ts`

**問題**:
- YouTube 直接分析和 LLM 調用有重複的模型選擇邏輯
- 兩個地方都嘗試多個模型

**建議**:
- 將模型選擇邏輯提取到共用函數
- 統一使用 SDK 實現

### 6. 類型安全
**位置**: 多處使用 `any` 類型

**問題**:
- `server/youtubeService.ts:77` - `videoInfo: any`
- `server/_core/llm.ts:407` - `error: any`
- 缺少完整的類型定義

**建議**:
```typescript
// 定義明確的類型
interface VideoInfo {
  title: string;
  duration: number;
  // ...
}
```

### 7. 資料庫連接池管理
**位置**: `server/db.ts:6-29`

**問題**:
- 單例模式，但沒有連接池配置
- 沒有處理連接斷開的情況
- 缺少重連機制

**建議**:
```typescript
// 配置連接池
const pool = mysql.createPool({
  connectionLimit: 10,
  // ...
});

// 處理連接錯誤和重連
pool.on('error', (err) => {
  console.error('[Database] Pool error:', err);
  // 重連邏輯
});
```

### 8. 缺少請求超時處理
**位置**: `server/youtubeService.ts`, `server/_core/llm.ts`

**問題**:
- Gemini API 調用沒有明確的超時設定
- YouTube 下載有超時，但其他 API 調用沒有

**建議**:
```typescript
// 使用 AbortController 實現超時
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

## 🟢 低優先級（優化或改進）

### 9. 快取機制
**位置**: 無

**問題**:
- 相同 YouTube URL 會重複處理
- LLM 分析結果沒有快取

**建議**:
- 使用 Redis 或記憶體快取
- 快取 YouTube 影片資訊和轉錄結果
- 設定適當的 TTL

### 10. 速率限制
**位置**: 無

**問題**:
- 沒有 API 調用速率限制
- 可能觸發外部 API 的限制

**建議**:
```typescript
// 使用 p-limit 或類似的庫
import pLimit from 'p-limit';

const limit = pLimit(5); // 最多 5 個並發請求

const results = await Promise.all(
  tasks.map(task => limit(() => processTask(task)))
);
```

### 11. 監控和指標
**位置**: 無

**問題**:
- 缺少性能監控
- 沒有 API 調用統計
- 無法追蹤錯誤率

**建議**:
- 整合監控服務（如 Sentry）
- 記錄 API 調用時間和成功率
- 設定告警

### 12. 測試覆蓋率
**位置**: `server/*.test.ts`

**問題**:
- 測試文件存在但可能覆蓋率不足
- 缺少整合測試

**建議**:
- 增加單元測試
- 添加整合測試
- 設定 CI/CD 自動測試

### 13. 文檔和註釋
**位置**: 部分函數缺少 JSDoc

**問題**:
- 一些複雜函數缺少文檔
- 參數和返回值說明不足

**建議**:
```typescript
/**
 * 處理 YouTube 影片並生成 Podcast
 * 
 * @param youtubeUrl - YouTube 影片 URL
 * @returns Podcast 生成結果，包含轉錄、摘要、腳本等
 * @throws {Error} 當 URL 無效或處理失敗時
 */
export async function processYoutubeToPodcast(youtubeUrl: string) {
  // ...
}
```

### 14. 配置管理
**位置**: `server/_core/env.ts`

**問題**:
- 環境變數分散在多處
- 缺少配置驗證和預設值

**建議**:
- 使用配置驗證庫（如 zod）
- 集中管理所有配置
- 提供合理的預設值

### 15. 臨時檔案清理
**位置**: `server/youtubeService.ts:66-299`

**問題**:
- 雖然有清理邏輯，但異常情況下可能遺留檔案
- 沒有定期清理機制

**建議**:
```typescript
// 使用 try-finally 確保清理
try {
  // 處理邏輯
} finally {
  // 確保清理
  await fs.rm(tempDir, { recursive: true, force: true });
}

// 定期清理過期臨時檔案
setInterval(async () => {
  await cleanupOldTempFiles();
}, 3600000); // 每小時
```

### 16. 過度使用動態導入
**位置**: `server/routers.ts` (多處使用 `await import(...)`)

**問題**:
- 大量使用動態導入可能影響性能
- 增加調試難度
- 可能導致循環依賴問題

**建議**:
```typescript
// 改為靜態導入
import { getUserByUsername, createPasswordUser } from './db';
import { hashPassword } from './services/passwordService';
import { signJWT } from './_core/jwt';

// 只在真正需要時使用動態導入（如條件載入）
```

### 17. 缺少請求驗證
**位置**: `server/routers.ts`

**問題**:
- 輸入驗證不夠嚴格
- 缺少對惡意輸入的防護

**建議**:
```typescript
// 使用 zod 進行嚴格驗證
.input(z.object({
  youtubeUrl: z.string().url().refine(
    (url) => isValidYoutubeUrl(url),
    { message: "必須是有效的 YouTube URL" }
  ),
  // ...
}))
```

### 18. 硬編碼的配置值
**位置**: 多處

**問題**:
- 超時時間、重試次數等硬編碼在代碼中
- 難以調整和測試

**建議**:
```typescript
// 提取到配置
const CONFIG = {
  YOUTUBE_DOWNLOAD_TIMEOUT: 600000, // 10分鐘
  LLM_MAX_RETRIES: 3,
  TEMP_FILE_CLEANUP_INTERVAL: 3600000, // 1小時
};
```

## 📊 優先級總結

### 立即處理（本週）
1. ✅ YouTube 直接分析改用 SDK
2. ✅ 環境變數驗證
3. ✅ 統一錯誤處理

### 短期改進（本月）
4. 結構化日誌系統
5. 消除代碼重複
6. 改善類型安全
7. 資料庫連接池優化

### 長期優化（下個月）
8. 快取機制
9. 速率限制
10. 監控和指標
11. 測試覆蓋率提升

## 🎯 建議的實施順序

1. **第一階段**（穩定性）:
   - 統一 YouTube 分析使用 SDK
   - 添加環境變數驗證
   - 改善錯誤處理

2. **第二階段**（可維護性）:
   - 引入結構化日誌
   - 消除代碼重複
   - 改善類型定義

3. **第三階段**（性能）:
   - 添加快取
   - 實施速率限制
   - 優化資料庫查詢

4. **第四階段**（監控）:
   - 整合監控服務
   - 添加性能指標
   - 完善測試

