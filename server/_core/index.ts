import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // 驗證環境變數（在啟動前檢查）
  try {
    const { assertEnvironmentVariables } = await import("./validateEnv");
    assertEnvironmentVariables();
    console.log("[Startup] ✅ 環境變數驗證通過");
  } catch (error) {
    console.error("[Startup] ❌ 環境變數驗證失敗:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // 診斷環境變數（僅顯示已設定狀態，不顯示值）
  console.log("[Startup] Environment variables status:");
  console.log("[Startup] DATABASE_URL:", process.env.DATABASE_URL ? "Set (hidden)" : "NOT SET");
  console.log("[Startup] JWT_SECRET:", process.env.JWT_SECRET ? "Set (hidden)" : "NOT SET");
  console.log("[Startup] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set (hidden)" : "NOT SET");
  console.log("[Startup] ASSEMBLYAI_API_KEY:", process.env.ASSEMBLYAI_API_KEY ? "Set (hidden)" : "NOT SET");
  console.log("[Startup] GOOGLE_GEMINI_API_KEY:", process.env.GOOGLE_GEMINI_API_KEY ? "Set (hidden)" : "NOT SET");
  console.log("[Startup] NODE_ENV:", process.env.NODE_ENV);

  // 在啟動伺服器前執行資料庫遷移
  const { runMigrations } = await import("./migrate");
  await runMigrations();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Google OAuth routes
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // 優雅關閉處理
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}, starting graceful shutdown...`);
    
    server.close(async () => {
      console.log("[Server] HTTP server closed");
      
      // 關閉資料庫連接池
      const { closeDb } = await import("../db");
      await closeDb();
      
      console.log("[Server] Graceful shutdown completed");
      process.exit(0);
    });

    // 強制關閉超時（10 秒）
    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

startServer().catch(console.error);
