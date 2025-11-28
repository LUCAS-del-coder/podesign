import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // 強制登入，未登入時跳轉到 /login
  const { loading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  
  // 手機版 Sidebar 狀態（必須在所有 hooks 之前）
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 正在檢查登入狀態
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登入（正在跳轉）
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 已登入，顯示正常內容

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面版 Sidebar（md 以上顯示） */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 手機版 Sidebar（覆蓋式） */}
      {isMobileSidebarOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden">
            <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* 主內容區域 */}
      <main className="flex-1 overflow-y-auto bg-background flex flex-col">
        {/* 手機版頂部導航欄 */}
        <div className="md:hidden sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
        </div>

        {/* 頁面內容 */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
