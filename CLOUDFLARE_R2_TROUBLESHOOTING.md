# Cloudflare R2 故障排除

## 錯誤：Credential access key has length 33, should be 32

### 問題原因

Cloudflare R2 的 Access Key ID **必須是 32 個字元**，但您的 Access Key ID 長度不正確。

### 解決方案

1. **檢查 Access Key ID**
   - 前往 Cloudflare Dashboard → R2 → Manage R2 API Tokens
   - 找到您建立的 Token
   - 重新複製 **Access Key ID**（確保沒有多餘空格）

2. **確認長度**
   - Access Key ID 應該是 **32 個字元**（例如：`98ec7d583f8135455ce68474fd3904f8`）
   - 如果長度不對，可能是複製時有問題

3. **在 Railway 重新設定**
   - 前往 Railway → Variables
   - 找到 `CLOUDFLARE_ACCESS_KEY_ID`
   - 刪除並重新建立，確保：
     - 沒有前後空格
     - 沒有換行符號
     - 正好 32 個字元

4. **驗證格式**
   - Access Key ID 應該是 32 個十六進位字元（0-9, a-f）
   - 例如：`98ec7d583f8135455ce68474fd3904f8`（32 個字元）

### 常見問題

**Q: 我的 Access Key ID 是 34 個字元怎麼辦？**
A: 可能是複製時包含了額外的字元。請重新從 Cloudflare Dashboard 複製，確保只複製 Access Key ID 本身。

**Q: 如何確認 Access Key ID 的長度？**
A: 在 Railway Variables 中，可以查看 `CLOUDFLARE_ACCESS_KEY_ID` 的值。或者使用以下命令檢查：
```bash
echo -n "您的-access-key-id" | wc -c
```

**Q: Secret Access Key 有長度限制嗎？**
A: Secret Access Key 通常是 64 個字元，但也請確保沒有多餘空格。

### 正確的格式範例

```bash
# Access Key ID（32 個字元）
CLOUDFLARE_ACCESS_KEY_ID=98ec7d583f8135455ce68474fd3904f8

# Secret Access Key（64 個字元）
CLOUDFLARE_SECRET_ACCESS_KEY=00a34b7351045fdb6488a6bb6a04181e5610052990fb4bbe511b0fed990906d4

# Account ID（通常是 32 個字元）
CLOUDFLARE_ACCOUNT_ID=be8d92a6913bfda34fef80b59f48937e

# Bucket 名稱
CLOUDFLARE_R2_BUCKET=podesign
```

### 檢查清單

- [ ] Access Key ID 正好是 32 個字元
- [ ] Access Key ID 沒有前後空格
- [ ] Secret Access Key 沒有前後空格
- [ ] Account ID 正確
- [ ] Bucket 名稱正確
- [ ] 所有環境變數都已設定

### 如果問題持續

1. **重新建立 API Token**
   - 在 Cloudflare R2 中刪除舊的 Token
   - 建立新的 Token
   - 重新複製所有資訊

2. **檢查 Railway 環境變數**
   - 確認所有變數都已正確設定
   - 確認沒有多餘的空格或特殊字元

3. **查看 Railway 日誌**
   - 部署後查看日誌，確認系統使用的 Storage 類型
   - 應該看到：`[Storage] Using Cloudflare R2: bucket=...`

