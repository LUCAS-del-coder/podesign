# 快速修復 Storage 問題

## 問題

Manus Forge API 返回 404 錯誤，表示端點 `v1/storage/upload` 可能不存在或已變更。

## 解決方案：改用 AWS S3

### 步驟 1：建立 AWS S3 Bucket（5 分鐘）

1. 前往 [AWS Console](https://console.aws.amazon.com/)
2. 搜尋並進入 **S3**
3. 點擊 **Create bucket**
4. 設定：
   - **Bucket name**：例如 `podcast-maker-storage`（必須全球唯一）
   - **Region**：選擇 `us-east-1` 或離您最近的區域
   - **Block Public Access**：取消勾選（允許公開讀取）
   - 其他保持預設
5. 點擊 **Create bucket**

### 步驟 2：建立 IAM 使用者（5 分鐘）

1. 在 AWS Console 搜尋 **IAM**
2. 點擊 **Users** → **Create user**
3. 使用者名稱：`podcast-maker-s3-user`
4. 選擇 **Provide user access to the AWS Management Console** → **Next**
5. 選擇 **Attach policies directly**
6. 搜尋並勾選 **AmazonS3FullAccess**
7. 點擊 **Next** → **Create user**
8. **重要**：點擊 **Create access key**
9. 選擇 **Application running outside AWS**
10. **立即複製 Access Key ID 和 Secret Access Key**（只會顯示一次！）

### 步驟 3：設定 Bucket 公開讀取（可選，如果需要公開存取）

1. 回到 S3，點擊您的 bucket
2. 前往 **Permissions** 標籤
3. 在 **Bucket policy** 中點擊 **Edit**
4. 貼上以下政策（將 `your-bucket-name` 替換為您的 bucket 名稱）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

5. 點擊 **Save changes**

### 步驟 4：在 Railway 設定環境變數

在 Railway 的 **Variables** 標籤頁中，新增以下環境變數：

```bash
AWS_ACCESS_KEY_ID=你的-access-key-id
AWS_SECRET_ACCESS_KEY=你的-secret-access-key
AWS_REGION=us-east-1（或您選擇的區域）
AWS_S3_BUCKET=你的-bucket-名稱
```

**重要：**
- 不需要移除 `BUILT_IN_FORGE_API_URL` 和 `BUILT_IN_FORGE_API_KEY`
- 系統會自動優先使用 AWS S3
- 設定完成後，Railway 會自動重新部署

### 步驟 5：驗證

部署完成後，再次測試 YouTube 轉錄功能。如果成功，您應該會看到：
- `[Storage] Using AWS S3: bucket=...`
- `[Storage] AWS S3 upload successful: ...`

## 成本估算

AWS S3 的費用非常低：
- **儲存**：$0.023/GB/月
- **請求**：$0.005/1000 次 PUT，$0.0004/1000 次 GET
- **傳輸**：前 100GB/月免費

對於一般使用量（每月 10-50GB），費用通常在 **$1-5 美元**之間。

## 故障排除

### 錯誤：AWS S3 is not configured

**原因**：缺少必要的環境變數

**解決方案**：確認所有 4 個 AWS 環境變數都已設定

### 錯誤：Access Denied

**原因**：IAM 使用者沒有權限

**解決方案**：確認 IAM 使用者已附加 `AmazonS3FullAccess` 政策

### 錯誤：NoSuchBucket

**原因**：Bucket 名稱錯誤

**解決方案**：確認 `AWS_S3_BUCKET` 的值與實際 bucket 名稱完全一致

## 完成後

設定完成後，您的應用程式將：
- ✅ 自動使用 AWS S3 儲存檔案
- ✅ 不再依賴 Manus Forge API
- ✅ 更穩定可靠
- ✅ 完全可控

