import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Youtube, FileText, Link as LinkIcon, Sparkles, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { convertVoiceNameToTraditional } from "@shared/voiceNameConverter";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [inputType, setInputType] = useState<'youtube' | 'text' | 'article'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [mode, setMode] = useState<'quick' | 'medium' | 'deep'>('medium');
  const [style, setStyle] = useState<'educational' | 'casual' | 'professional'>('casual');
  const [hostCount, setHostCount] = useState<'1' | '2'>('2');
  const [introEnabled, setIntroEnabled] = useState(true);
  const [outroEnabled, setOutroEnabled] = useState(true);
  const [host1Voice, setHost1Voice] = useState<string>("");
  const [host2Voice, setHost2Voice] = useState<string>("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [introText, setIntroText] = useState<string>("");
  const [outroText, setOutroText] = useState<string>("");
  const [videoInfo, setVideoInfo] = useState<{
    title: string;
    duration: number;
    durationFormatted: string;
    estimatedSizeMB: number;
    willExceedLimit: boolean;
    thumbnail?: string;
  } | null>(null);
  const [checkingVideo, setCheckingVideo] = useState(false);

  const getVideoInfoMutation = trpc.podcast.getVideoInfo.useMutation({
    onSuccess: (data) => {
      setVideoInfo(data);
      if (data.willExceedLimit) {
        toast.warning(
          `影片較長（${data.durationFormatted}），預估音檔大小 ${data.estimatedSizeMB}MB，可能會超過 16MB 限制。建議使用文字輸入功能。`,
          { duration: 5000 }
        );
      } else {
        toast.success(`影片資訊已獲取：${data.title}`);
      }
      setCheckingVideo(false);
    },
    onError: (error) => {
      toast.error(`無法獲取影片資訊：${error.message}`);
      setVideoInfo(null);
      setCheckingVideo(false);
    },
  });

  const createTaskMutation = trpc.podcast.create.useMutation({
    onSuccess: () => {
      toast.success("任務已建立！正在處理中...");
      // 清空表單
      setYoutubeUrl("");
      setTextContent("");
      setArticleUrl("");
      setIntroText("");
      setOutroText("");
    },
    onError: (error) => {
      toast.error(`建立任務失敗：${error.message}`);
    },
  });

  const voicesQuery = trpc.podcast.getVoices.useQuery(undefined, {
    enabled: !!user,
  });

  const voicePreferenceQuery = trpc.podcast.getVoicePreference.useQuery(undefined, {
    enabled: !!user,
  });

  // 試聽聲音
  const handlePlayVoice = (voiceId: string) => {
    const voice = voicesQuery.data?.find(v => v.speakerId === voiceId);
    if (!voice || !voice.demoAudioUrl) {
      toast.error("該聲音沒有試聽檔案");
      return;
    }

    // 如果正在播放同一個聲音，則暫停
    if (playingVoice === voiceId && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoice(null);
      return;
    }

    // 停止當前播放
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 播放新的聲音
    const audio = new Audio(voice.demoAudioUrl);
    audioRef.current = audio;
    setPlayingVoice(voiceId);

    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
      toast.error("播放失敗");
      setPlayingVoice(null);
    });

    // 播放結束後重置狀態
    audio.onended = () => {
      setPlayingVoice(null);
    };
  };

  // 載入使用者的聲音偏好
  useEffect(() => {
    if (voicePreferenceQuery.data) {
      setHost1Voice(voicePreferenceQuery.data.voiceId1 || "");
      setHost2Voice(voicePreferenceQuery.data.voiceId2 || "");
    }
  }, [voicePreferenceQuery.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("請先登入");
      return;
    }

    createTaskMutation.mutate({
      youtubeUrl: inputType === 'youtube' ? youtubeUrl : undefined,
      textContent: inputType === 'text' ? textContent : undefined,
      articleUrl: inputType === 'article' ? articleUrl : undefined,
      inputType,
      voiceId1: host1Voice || undefined,
      voiceId2: host2Voice || undefined,
      mode,
      style,
      introText: introText.trim() || undefined,
      outroText: outroText.trim() || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">歡迎使用 Podcast 製作工具</CardTitle>
            <CardDescription>
              使用 AI 技術，將 YouTube 影片、文章或文字快速轉換為高品質 Podcast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              className="w-full"
              size="lg"
            >
              登入開始使用
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-4xl py-6 md:py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">AI Podcast Generator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Instantly turn text, PDFs, websites, videos, or notes into podcasts—free, fast, customizable voices and languages.
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-xl border-0 bg-card/50 backdrop-blur">
          <CardContent className="p-4 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Input Type Tabs */}
              <Tabs value={inputType} onValueChange={(value: any) => setInputType(value)}>
                <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                  <TabsTrigger value="youtube" className="gap-2 py-3">
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-2 py-3">
                    <FileText className="h-4 w-4" />
                    文字
                  </TabsTrigger>
                  <TabsTrigger value="article" className="gap-2 py-3">
                    <LinkIcon className="h-4 w-4" />
                    文章網址
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="youtube" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="youtube-url">YouTube 網址</Label>
                    <div className="flex gap-2">
                      <Input
                        id="youtube-url"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => {
                          setYoutubeUrl(e.target.value);
                          setVideoInfo(null); // 清除舊的影片資訊
                        }}
                        required={inputType === 'youtube'}
                        className="h-12 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!youtubeUrl) {
                            toast.error("請輸入 YouTube 網址");
                            return;
                          }
                          setCheckingVideo(true);
                          getVideoInfoMutation.mutate({ youtubeUrl });
                        }}
                        disabled={checkingVideo || !youtubeUrl}
                        className="h-12 px-6"
                      >
                        {checkingVideo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            檢查中
                          </>
                        ) : (
                          "檢查影片"
                        )}
                      </Button>
                    </div>
                    {videoInfo && (
                      <Card className="mt-4 border-blue-200 bg-blue-50/50">
                        <CardContent className="pt-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-gray-700">標題：</span>
                              <span className="flex-1 text-gray-900">{videoInfo.title}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">長度：</span>
                                <span className="text-gray-900">{videoInfo.durationFormatted}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">預估大小：</span>
                                <span className={videoInfo.willExceedLimit ? "text-red-600 font-semibold" : "text-green-600"}>
                                  {videoInfo.estimatedSizeMB} MB
                                </span>
                              </div>
                            </div>
                            {videoInfo.willExceedLimit && (
                              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
                                ⚠️ 影片較長，可能會超過 16MB 限制。建議：
                                <ul className="list-disc list-inside mt-1 ml-2">
                                  <li>使用「文字」輸入功能</li>
                                  <li>或選擇較短的影片（建議 30 分鐘以內）</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="text" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-content">文字內容</Label>
                    <Textarea
                      id="text-content"
                      placeholder="輸入您想要轉換成 Podcast 的文字內容..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      required={inputType === 'text'}
                      rows={8}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      0/{textContent.length}000
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="article" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="article-url">文章網址</Label>
                    <Input
                      id="article-url"
                      type="url"
                      placeholder="https://example.com/article"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      required={inputType === 'article'}
                      className="h-12"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Settings Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Podcast 長度</Label>
                  <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="選擇長度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">4-5 分鐘</SelectItem>
                      <SelectItem value="medium">7-8 分鐘</SelectItem>
                      <SelectItem value="deep">10-12 分鐘</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>對話風格</Label>
                  <Select value={style} onValueChange={(value: any) => setStyle(value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="選擇風格" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">輕鬆閒聊</SelectItem>
                      <SelectItem value="educational">教育講解</SelectItem>
                      <SelectItem value="professional">專業訪談</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>主持人數量</Label>
                  <Select value={hostCount} onValueChange={(value: any) => setHostCount(value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="選擇人數" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 人獨白</SelectItem>
                      <SelectItem value="2">2 人對話</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Voice Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>主持人 1 聲音</Label>
                  <div className="flex gap-2">
                    <Select value={host1Voice} onValueChange={setHost1Voice}>
                      <SelectTrigger className="h-11 flex-1">
                        <SelectValue placeholder="選擇聲音" />
                      </SelectTrigger>
                      <SelectContent>
                        {voicesQuery.data?.map((voice) => (
                          <SelectItem key={voice.speakerId} value={voice.speakerId}>
                            {convertVoiceNameToTraditional(voice.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {host1Voice && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => handlePlayVoice(host1Voice)}
                      >
                        {playingVoice === host1Voice ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>主持人 2 聲音</Label>
                  <div className="flex gap-2">
                    <Select value={host2Voice} onValueChange={setHost2Voice}>
                      <SelectTrigger className="h-11 flex-1">
                        <SelectValue placeholder="選擇聲音" />
                      </SelectTrigger>
                      <SelectContent>
                        {voicesQuery.data?.map((voice) => (
                          <SelectItem key={voice.speakerId} value={voice.speakerId}>
                            {convertVoiceNameToTraditional(voice.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {host2Voice && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => handlePlayVoice(host2Voice)}
                      >
                        {playingVoice === host2Voice ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Intro and Outro Text Inputs */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="intro-text">開場白文字（選填）</Label>
                  <Textarea
                    id="intro-text"
                    placeholder="例如：歡迎收聽今天的節目！"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    開場白將在主要內容之前播放
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outro-text">結尾語文字（選填）</Label>
                  <Textarea
                    id="outro-text"
                    placeholder="例如：感謝收聽，我們下次見！"
                    value={outroText}
                    onChange={(e) => setOutroText(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    結尾語將在主要內容之後播放
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg font-semibold"
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    處理中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Podcast
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <CardHeader>
              <CardTitle className="text-lg">My Podcast</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                查看您的 Podcast 製作記錄，請前往「作品庫」頁面
              </p>
            </CardContent>
          </Card>


        </div>
      </div>
    </div>
  );
}
