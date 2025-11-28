# AWS S3 設定指南

## 概述

專案現在支援兩種 Storage 方案：
1. **AWS S3**（推薦）：適合自架部署
2. **Manus Forge API**（備用）：如果已配置 Manus 帳號

系統會自動選擇：如果配置了 AWS S3，優先使用 S3；否則使用 Manus Forge API。

## AWS S3 設定步驟

### 1. 建立 AWS S3 Bucket

1. 登入 [AWS Console](https://console.aws.amazon.com/)
2. 前往 **S3** 服務
3. 點擊 **Create bucket**
4. 設定：
   - **Bucket name**：例如 `podcast-maker-storage`
   - **Region**：選擇離您最近的區域（例如 `us-east-1`）
   - **Block Public Access**：根據需求設定（如果需要公開存取，需要關閉）
   - 其他設定保持預設即可

### 2. 建立 IAM 使用者並取得 Access Key

1. 前往 **IAM** 服務
2. 點擊 **Users** → **Create user**
3. 設定使用者名稱（例如 `podcast-maker-s3-user`）
4. 選擇 **Programmatic access**
5. 附加政策：選擇 **AmazonS3FullAccess**（或建立自訂政策，僅允許特定 bucket）
6. 建立使用者後，**立即複製 Access Key ID 和 Secret Access Key**（只會顯示一次）

### 3. 設定 Bucket 權限（如果需要公開存取）

如果您的檔案需要公開存取（例如音訊檔案），需要設定 Bucket Policy：

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

### 4. 在 Railway 設定環境變數

在 Railway 專案的 **Variables** 標籤頁中，新增以下環境變數：

```bash
# AWS S3 配置（必要）
AWS_ACCESS_KEY_ID=你的-aws-access-key-id
AWS_SECRET_ACCESS_KEY=你的-aws-secret-access-key
AWS_REGION=你的-aws-region（例如：us-east-1）
AWS_S3_BUCKET=你的-bucket-名稱

# AWS S3 公開 URL（選用，如果有使用 CloudFront 或自訂網域）
AWS_S3_PUBLIC_URL=https://your-cdn-domain.com
```

**注意：**
- 如果沒有設定 `AWS_S3_PUBLIC_URL`，系統會自動使用標準 S3 URL 格式
- 所有環境變數都應該在 Railway 的 **Variables** 標籤頁中設定

## 驗證設定

設定完成後，重新部署應用程式。如果設定正確，您應該能夠：

1. ✅ 成功上傳 YouTube 音訊檔案到 S3
2. ✅ 成功轉錄音訊
3. ✅ 成功生成 Podcast

## 故障排除

### 錯誤：AWS S3 is not configured

**原因**：缺少必要的 AWS 環境變數

**解決方案**：
- 檢查是否設定了所有必要的環境變數：
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_S3_BUCKET`

### 錯誤：AWS S3 upload failed: Access Denied

**原因**：IAM 使用者沒有足夠的權限

**解決方案**：
- 確認 IAM 使用者有 `s3:PutObject` 和 `s3:GetObject` 權限
- 檢查 Bucket Policy 是否允許存取

### 錯誤：AWS S3 upload failed: NoSuchBucket

**原因**：Bucket 名稱錯誤或不存在

**解決方案**：
- 確認 `AWS_S3_BUCKET` 環境變數的值與實際 Bucket 名稱一致
- 確認 Bucket 在正確的 Region 中

## 成本估算

AWS S3 的費用通常很低：
- **儲存費用**：約 $0.023/GB/月
- **請求費用**：PUT 請求 $0.005/1000 次，GET 請求 $0.0004/1000 次
- **資料傳輸**：前 100GB/月免費

對於一般使用量，每月費用通常在 $1-5 美元之間。

## 安全性建議

1. **最小權限原則**：只給予 IAM 使用者必要的 S3 權限
2. **定期輪換 Access Key**：建議每 90 天更換一次
3. **使用 CloudFront**：如果需要公開存取，建議使用 CloudFront CDN 而不是直接公開 S3
4. **啟用版本控制**：在 S3 Bucket 中啟用版本控制以保護資料

