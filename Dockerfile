# 使用 Node.js 22 作為基礎映像
FROM node:22-slim

# 安裝必要的系統工具（僅用於建置和運行）
# 包括 ffmpeg 和必要的依賴
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 直接下載 yt-dlp 二進位檔（不需要 Python）
# 這是更可靠的方式，避免 Python 環境問題
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# 驗證安裝
RUN yt-dlp --version && ffmpeg -version | head -n 1

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# 安裝 pnpm
RUN npm install -g pnpm

# 安裝依賴
# 使用 --no-frozen-lockfile 以允許在 lockfile 過時時更新
RUN pnpm install --no-frozen-lockfile

# 複製專案檔案
COPY . .

# 建置前端
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["pnpm", "start"]
