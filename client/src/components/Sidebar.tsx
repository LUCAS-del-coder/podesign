import { Home, History, Headphones, LogOut, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { APP_TITLE, APP_LOGO } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps = {}) {
  const [location] = useLocation();

  const navItems = [
    {
      title: "工作區",
      href: "/",
      icon: Home,
    },
    {
      title: "作品庫",
      href: "/history",
      icon: History,
    },
  ];

  return (
    <div className="flex flex-col h-full w-64 border-r bg-background">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Headphones className="h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
          <p className="text-xs text-muted-foreground">AI Podcast 製作工具</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground font-medium"
                )}
                onClick={() => onClose?.()}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <UserSection />

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          © 2025 {APP_TITLE}
        </div>
      </div>
    </div>
  );
}

function UserSection() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("已登出");
      // 跳轉到登入頁面
      setLocation("/login");
    } catch (error) {
      toast.error("登出失敗");
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 border-t space-y-3">
      {/* 使用者資訊 */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user.name || user.username || "使用者"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email || ""}
          </p>
        </div>
      </div>

      {/* 登出按鈕 */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        登出
      </Button>
    </div>
  );
}
