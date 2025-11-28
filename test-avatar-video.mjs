import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc } from "drizzle-orm";
import { podcastTasks, podcastHighlights, avatarVideoTasks } from "./drizzle/schema.js";

// 連接資料庫
const db = drizzle(process.env.DATABASE_URL);

console.log("=== 開始測試虛擬主播影片生成流程 ===\n");

// 1. 查詢最新的已完成任務
console.log("步驟 1: 查詢最新的已完成任務...");
const tasks = await db
  .select()
  .from(podcastTasks)
  .where(eq(podcastTasks.status, "completed"))
  .orderBy(desc(podcastTasks.createdAt))
  .limit(1);

if (tasks.length === 0) {
  console.error("❌ 沒有找到已完成的任務");
  process.exit(1);
}

const task = tasks[0];
console.log(`✅ 找到任務: ${task.title || task.youtubeUrl}`);
console.log(`   任務 ID: ${task.id}`);
console.log(`   音檔 URL: ${task.podcastAudioUrl || task.audioUrl || "無"}\n`);

// 2. 檢查是否已有精華片段
console.log("步驟 2: 檢查精華片段...");
const existingHighlights = await db
  .select()
  .from(podcastHighlights)
  .where(eq(podcastHighlights.taskId, task.id));

if (existingHighlights.length > 0) {
  console.log(`✅ 已有 ${existingHighlights.length} 個精華片段`);
  for (const h of existingHighlights) {
    console.log(`   - ${h.title}: ${h.duration} 秒`);
  }
} else {
  console.log("⚠️  尚無精華片段，需要先生成");
  console.log("   請在瀏覽器中點擊「生成精華版本」按鈕");
  process.exit(0);
}

// 3. 選擇一個符合條件的精華片段（60 秒以內）
console.log("\n步驟 3: 選擇符合條件的精華片段...");
const validHighlight = existingHighlights.find(h => h.duration > 0 && h.duration <= 60);

if (!validHighlight) {
  console.error("❌ 沒有找到符合條件的精華片段（需要 1-60 秒）");
  console.log("   現有精華片段:");
  for (const h of existingHighlights) {
    console.log(`   - ${h.title}: ${h.duration} 秒 ${h.duration > 60 ? "❌ 超過限制" : h.duration <= 0 ? "❌ 無效時長" : "✅"}`);
  }
  process.exit(1);
}

console.log(`✅ 選擇精華片段: ${validHighlight.title}`);
console.log(`   時長: ${validHighlight.duration} 秒`);
console.log(`   音檔: ${validHighlight.audioUrl}\n`);

// 4. 檢查是否已有影片任務
console.log("步驟 4: 檢查現有影片任務...");
const existingVideoTasks = await db
  .select()
  .from(avatarVideoTasks)
  .where(eq(avatarVideoTasks.highlightId, validHighlight.id));

if (existingVideoTasks.length > 0) {
  console.log(`⚠️  已有 ${existingVideoTasks.length} 個影片任務:`);
  for (const vt of existingVideoTasks) {
    console.log(`   - 狀態: ${vt.status}, 建立時間: ${vt.createdAt}`);
  }
  console.log("\n   如需重新測試，請先刪除這些任務或使用其他精華片段");
} else {
  console.log("✅ 尚無影片任務，可以開始生成");
}

console.log("\n=== 測試資訊收集完成 ===");
console.log("\n下一步:");
console.log("1. 如果沒有精華片段，請在瀏覽器中生成");
console.log("2. 如果有精華片段，請點擊「生成虛擬主播影片」按鈕");
console.log("3. 或者使用 tRPC API 直接呼叫 generateAvatarVideo");
