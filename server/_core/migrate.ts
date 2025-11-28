/**
 * 資料庫遷移工具
 * 在應用啟動時自動執行資料庫遷移（使用 drizzle-kit push）
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Migration] DATABASE_URL not set, skipping migration");
    return;
  }

  try {
    console.log("[Migration] Starting database migration with drizzle-kit push...");
    
    // 使用 drizzle-kit push 來同步 schema
    const { stdout, stderr } = await execAsync("pnpm drizzle-kit push", {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      cwd: process.cwd(),
    });

    if (stdout) {
      console.log("[Migration] Output:", stdout);
    }
    if (stderr) {
      console.warn("[Migration] Warnings:", stderr);
    }

    console.log("[Migration] Migration completed successfully");
  } catch (error: any) {
    // 如果 drizzle-kit 不在 PATH 中，嘗試使用 npx
    try {
      console.log("[Migration] Trying with npx drizzle-kit push...");
      const { stdout, stderr } = await execAsync("npx drizzle-kit push", {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        cwd: process.cwd(),
      });

      if (stdout) {
        console.log("[Migration] Output:", stdout);
      }
      if (stderr) {
        console.warn("[Migration] Warnings:", stderr);
      }

      console.log("[Migration] Migration completed successfully");
    } catch (npxError: any) {
      console.error("[Migration] Migration failed:", error.message || error);
      console.error("[Migration] npx also failed:", npxError.message || npxError);
      // 不拋出錯誤，讓應用繼續啟動
      // 管理員可以手動執行遷移
    }
  }
}

