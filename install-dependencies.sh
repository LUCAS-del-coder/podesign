#!/bin/bash

# 這個腳本曾負責在部署期間安裝 Python、yt-dlp 與 ffmpeg。
# 由於系統已全面改為純 JavaScript 方案（@distube/ytdl-core + @ffmpeg-installer/ffmpeg），
# 現在不需要額外的系統套件，這個腳本只保留提示訊息以維持相容性。

echo "ℹ️  install-dependencies.sh：已改用純 Node.js 方案，無需額外安裝 Python/yt-dlp/ffmpeg。"
echo "ℹ️  若需要手動驗證，請執行："
echo "    - pnpm why @distube/ytdl-core"
echo "    - node -e \"console.log(require('@ffmpeg-installer/ffmpeg').path)\""
echo "✅  無需其他動作"
