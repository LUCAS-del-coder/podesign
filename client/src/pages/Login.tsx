import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Headphones } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("登入成功！");
      // 重新載入頁面以更新認證狀態
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("註冊成功！");
      // 重新載入頁面以更新認證狀態
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("請填寫所有欄位");
      return;
    }
    
    if (password.length < 6) {
      toast.error("密碼至少需要 6 個字元");
      return;
    }

    if (isLogin) {
      loginMutation.mutate({ username, password });
    } else {
      registerMutation.mutate({ username, password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景圖片 - 黑色流動質感 */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/login-bg.jpg)',
        }}
      />
      
      {/* 深色遮罩層，增強文字可讀性 */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* 登入卡片 */}
      <Card className="w-full max-w-md relative backdrop-blur-2xl bg-black/20 border-white/20 shadow-2xl">
        <CardHeader className="space-y-6 pb-8">
          {/* Logo 和網站名稱 */}
          <div className="flex flex-col items-center gap-6">
            {/* Logo 容器 */}
            <div className="relative">
              {/* Logo 主體 - 純白色 */}
              <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-2xl">
                <Headphones className="w-10 h-10 text-black" strokeWidth={2.5} />
              </div>
            </div>
            
            {/* 標題區 */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                {APP_TITLE}
              </h1>
            </div>
          </div>
          
          {/* 登入/註冊標題 */}
          <div className="text-center space-y-2 pt-4 border-t border-white/10">
            <CardTitle className="text-2xl text-white drop-shadow-lg">{isLogin ? "登入" : "註冊"}</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">
              {isLogin ? "使用您的帳號登入" : "建立新帳號"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 使用者名稱 */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/90 text-sm font-medium drop-shadow">
                使用者名稱
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="輸入使用者名稱"
                disabled={isLoading}
                required
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400/50 focus:ring-blue-400/20 backdrop-blur-sm transition-all"
              />
            </div>

            {/* 密碼 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90 text-sm font-medium drop-shadow">
                密碼
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "輸入密碼" : "至少 6 個字元"}
                disabled={isLoading}
                required
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400/50 focus:ring-blue-400/20 backdrop-blur-sm transition-all"
              />
            </div>

            {/* 登入按鈕 */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-white hover:bg-gray-100 text-black font-medium shadow-lg hover:shadow-xl transition-all duration-200 mt-6" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  處理中...
                </>
              ) : (
                isLogin ? "登入" : "註冊"
              )}
            </Button>

            {/* 切換登入/註冊 */}
            <div className="text-center text-sm pt-4">
              {isLogin ? (
                <span className="text-white/70 drop-shadow">
                  還沒有帳號？{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-white hover:text-white/90 font-medium transition-colors underline"
                    disabled={isLoading}
                  >
                    立即註冊
                  </button>
                </span>
              ) : (
                <span className="text-white/70 drop-shadow">
                  已經有帳號？{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-white hover:text-white/90 font-medium transition-colors underline"
                    disabled={isLoading}
                  >
                    立即登入
                  </button>
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
