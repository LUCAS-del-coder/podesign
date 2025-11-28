# 推送到 GitHub 指南

## 步驟 1：初始化 Git 並提交程式碼

在終端機中執行以下命令：

```bash
# 進入專案目錄
cd "/Users/idea3c/Downloads/podcast-maker (3)"

# 初始化 Git 倉庫
git init

# 添加所有檔案
git add .

# 建立初始提交
git commit -m "初始提交：Podcast Maker 專案，支援純 Node.js 環境"
```

## 步驟 2：在 GitHub 建立新倉庫

1. **前往 GitHub**：https://github.com
2. **登入**你的帳號
3. **點擊右上角的 "+"** → 選擇 **"New repository"**
4. **填寫倉庫資訊**：
   - Repository name: `podcast-maker`（或你喜歡的名稱）
   - Description: `Podcast 一站式製作工具`
   - 選擇 **Public** 或 **Private**
   - **不要**勾選 "Initialize this repository with a README"（因為我們已經有程式碼了）
5. **點擊 "Create repository"**

## 步驟 3：連接本地倉庫並推送

GitHub 會顯示連接指令，在終端機執行：

```bash
# 添加遠端倉庫（將 YOUR_USERNAME 替換為你的 GitHub 用戶名）
git remote add origin https://github.com/YOUR_USERNAME/podcast-maker.git

# 或者使用 SSH（如果你有設定 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/podcast-maker.git

# 推送程式碼到 GitHub
git branch -M main
git push -u origin main
```

## 步驟 4：驗證

1. 重新整理 GitHub 頁面，應該能看到所有檔案
2. 確認 `.gitignore` 正確排除了 `node_modules` 和 `dist` 等目錄

## 常見問題

### 如果推送時要求輸入帳號密碼

**方法 1：使用 Personal Access Token**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 建立新 token，勾選 `repo` 權限
3. 推送時使用 token 作為密碼

**方法 2：使用 SSH（推薦）**
```bash
# 檢查是否已有 SSH key
ls -al ~/.ssh

# 如果沒有，建立新的 SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 複製 public key
cat ~/.ssh/id_ed25519.pub

# 在 GitHub → Settings → SSH and GPG keys → New SSH key 中新增
```

### 如果遇到 "remote origin already exists" 錯誤

```bash
# 移除現有的遠端連接
git remote remove origin

# 重新添加
git remote add origin https://github.com/YOUR_USERNAME/podcast-maker.git
```

### 如果檔案太大無法推送

檢查是否有大檔案：
```bash
# 找出大檔案
find . -type f -size +50M -not -path "./node_modules/*" -not -path "./.git/*"

# 如果有的話，添加到 .gitignore
```

## 後續更新

之後如果有程式碼變更，使用以下命令推送：

```bash
# 查看變更
git status

# 添加變更的檔案
git add .

# 提交變更
git commit -m "描述你的變更"

# 推送到 GitHub
git push
```

