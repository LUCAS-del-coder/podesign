# 使用 Node.js 22 作為基礎映像
FROM node:22-slim

# 安裝必要的系統工具（僅用於建置和運行）
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# 安裝 pnpm
RUN npm install -g pnpm

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製專案檔案
COPY . .

# 建置前端
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["pnpm", "start"]
