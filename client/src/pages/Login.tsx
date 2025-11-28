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

            {/* 分隔線 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/70">或</span>
              </div>
            </div>

            {/* Google 登入按鈕 */}
            <Button
              type="button"
              onClick={() => {
                window.location.href = "/api/oauth/google";
              }}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 border border-gray-300"
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              使用 Google 登入
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
