# Storage 替代方案指南

由於 AWS 無法登入，這裡提供其他免費或低成本的 Storage 替代方案。

## 推薦方案（按優先順序）

### 1. Cloudflare R2 ⭐ 最推薦

**優點：**
- ✅ **完全免費**：10GB 儲存 + 每月 1,000,000 次 Class A 操作（讀取）
- ✅ **S3 兼容 API**：可以直接使用，無需修改代碼
- ✅ **無出口費用**：下載檔案不計費（與 AWS S3 不同）
- ✅ **設定簡單**：只需 5-10 分鐘
- ✅ **全球 CDN**：速度快

**設定步驟：**

1. **註冊 Cloudflare 帳號**
   - 前往 [Cloudflare](https://dash.cloudflare.com/sign-up)
   - 註冊或登入帳號（免費）

2. **建立 R2 Bucket**
   - 在 Cloudflare Dashboard 中，前往 **R2**
   - 點擊 **Create bucket**
   - 輸入 Bucket 名稱（例如 `podcast-maker-storage`）
   - 選擇位置（建議選擇離您最近的）
   - 點擊 **Create bucket**

3. **建立 API Token**
   - 在 R2 頁面，點擊 **Manage R2 API Tokens**
   - 點擊 **Create API Token**
   - 設定：
     - **Token name**：`podcast-maker-r2-token`
     - **Permissions**：選擇 **Object Read & Write**
     - **TTL**：留空（永久有效）或設定到期時間
   - 點擊 **Create API Token**
   - **重要**：立即複製 **S3 Client Credentials** 中的：
     - **Access Key ID**（通常是 20 個字元，但可能不同）
     - **Secret Access Key**（通常是 64 個字元）
   - **注意**：不要複製「Cloudflare API Token」，要複製「S3 Client Credentials」！

4. **取得 Account ID**
   - 在 Cloudflare Dashboard 右側，可以看到 **Account ID**
   - 複製這個 ID

5. **設定公開存取（可選）**
   - 在 Bucket 設定中，可以設定 **Custom Domain** 或使用預設的 R2 URL
   - 如果需要公開存取，需要設定 CORS 和公開讀取權限

6. **在 Railway 設定環境變數**
   ```bash
   CLOUDFLARE_ACCOUNT_ID=你的-account-id
   CLOUDFLARE_ACCESS_KEY_ID=你的-access-key-id
   CLOUDFLARE_SECRET_ACCESS_KEY=你的-secret-access-key
   CLOUDFLARE_R2_BUCKET=你的-bucket-名稱
   CLOUDFLARE_R2_PUBLIC_URL=https://你的-自訂網域（選用）
   ```

**成本：** 完全免費（10GB 儲存 + 100 萬次讀取/月）

---

### 2. Backblaze B2 ⭐ 也很推薦

**優點：**
- ✅ **免費額度**：10GB 儲存 + 每天 1GB 下載
- ✅ **S3 兼容 API**：可以直接使用
- ✅ **成本低**：超出免費額度後，儲存 $0.005/GB/月，下載 $0.01/GB
- ✅ **設定簡單**：約 10 分鐘

**設定步驟：**

1. **註冊 Backblaze 帳號**
   - 前往 [Backblaze](https://www.backblaze.com/b2/sign-up.html)
   - 註冊帳號（需要信用卡，但不會收費除非超出免費額度）

2. **建立 Bucket**
   - 登入後，前往 **B2 Cloud Storage**
   - 點擊 **Create a Bucket**
   - 設定：
     - **Bucket Name**：例如 `podcast-maker-storage`
     - **Files in Bucket are**：選擇 **Public**（如果需要公開存取）
   - 點擊 **Create a Bucket**

3. **建立 Application Key**
   - 前往 **App Keys**
   - 點擊 **Add a New Application Key**
   - 設定：
     - **Key Name**：`podcast-maker-key`
     - **Allow access to Bucket(s)**：選擇您剛建立的 bucket
     - **Allow List All Bucket Names**：可選
     - **Allow Read Files**：勾選
     - **Allow Write Files**：勾選
     - **Allow Delete Files**：可選
   - 點擊 **Create New Key**
   - **重要**：立即複製 **keyID** 和 **applicationKey**（只會顯示一次！）

4. **在 Railway 設定環境變數**
   ```bash
   BACKBLAZE_KEY_ID=你的-key-id
   BACKBLAZE_APPLICATION_KEY=你的-application-key
   BACKBLAZE_BUCKET_NAME=你的-bucket-名稱
   BACKBLAZE_REGION=us-west-004（或您的 bucket 區域）
   BACKBLAZE_PUBLIC_URL=https://你的-自訂網域（選用）
   ```

**成本：** 免費（10GB 儲存 + 每天 1GB 下載），超出後 $0.005/GB/月

---

### 3. Google Cloud Storage

**優點：**
- ✅ 免費額度：5GB 儲存
- ✅ 與 Google 帳號整合
- ⚠️ 需要設定 Google Cloud 專案

**設定步驟：**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案
3. 啟用 Cloud Storage API
4. 建立 Bucket
5. 建立 Service Account 並取得 JSON key

**注意：** 需要額外實作 Google Cloud Storage 的整合（目前代碼不支援，需要修改）

---

## 系統自動選擇順序

系統會按以下順序自動選擇 Storage：

1. **Cloudflare R2**（如果配置）
2. **Backblaze B2**（如果配置）
3. **AWS S3**（如果配置）
4. **Manus Forge API**（備用，但目前無法使用）

## 快速設定檢查清單

### Cloudflare R2
- [ ] 註冊 Cloudflare 帳號
- [ ] 建立 R2 Bucket
- [ ] 建立 API Token
- [ ] 取得 Account ID
- [ ] 在 Railway 設定環境變數

### Backblaze B2
- [ ] 註冊 Backblaze 帳號
- [ ] 建立 Bucket
- [ ] 建立 Application Key
- [ ] 在 Railway 設定環境變數

## 成本比較

| 服務 | 免費額度 | 超出後成本 | 推薦度 |
|------|---------|-----------|--------|
| **Cloudflare R2** | 10GB + 100萬次讀取/月 | $0.015/GB/月 | ⭐⭐⭐⭐⭐ |
| **Backblaze B2** | 10GB + 每天1GB下載 | $0.005/GB/月 | ⭐⭐⭐⭐ |
| **AWS S3** | 5GB（12個月） | $0.023/GB/月 | ⭐⭐⭐ |
| **Manus Forge API** | 取決於方案 | 未知 | ❌ 無法使用 |

## 建議

**強烈推薦使用 Cloudflare R2**，因為：
1. ✅ 完全免費（10GB 足夠使用）
2. ✅ 無出口費用（下載不計費）
3. ✅ 設定最簡單
4. ✅ 全球 CDN，速度快
5. ✅ 不需要信用卡（除非超出免費額度）

設定完成後，系統會自動使用 Cloudflare R2，YouTube 轉錄功能應該可以立即恢復正常！

