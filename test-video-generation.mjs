/**
 * 測試虛擬主播影片生成流程
 * 這個腳本會：
 * 1. 查詢最新的已完成任務
 * 2. 生成精華片段（如果還沒有）
 * 3. 生成虛擬主播影片
 */

import { execSync } from 'child_process';

console.log("=== 測試虛擬主播影片生成流程 ===\n");

// 查詢最新任務
console.log("步驟 1: 查詢最新任務...");
const taskQuery = `
SELECT id, user_id, title, youtube_url, 
       CASE 
         WHEN podcast_audio_url IS NOT NULL THEN podcast_audio_url
         WHEN audio_url IS NOT NULL THEN audio_url
         ELSE NULL
       END as audio_url
FROM podcast_tasks
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 1;
`;

try {
  const result = execSync(
    `mysql -h $(echo $DATABASE_URL | sed 's/.*@\\(.*\\):.*/\\1/') -u $(echo $DATABASE_URL | sed 's/.*:\\/\\/\\(.*\\):.*/\\1/') -p$(echo $DATABASE_URL | sed 's/.*:\\/\\/.*:\\(.*\\)@.*/\\1/') -D $(echo $DATABASE_URL | sed 's/.*\\/\\(.*\\)\\?.*/\\1/') -e "${taskQuery}" -s -N`,
    { encoding: 'utf-8' }
  );
  
  console.log("查詢結果:", result);
} catch (error) {
  console.error("❌ 資料庫查詢失敗:", error.message);
  process.exit(1);
}

console.log("\n=== 測試完成 ===");
