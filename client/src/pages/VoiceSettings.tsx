import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Headphones, Play, Check, Settings } from "lucide-react";

export default function VoiceSettings() {
  const { user, loading, isAuthenticated } = useAuth();
  const [host1Voice, setHost1Voice] = useState<string | null>(null);
  const [host2Voice, setHost2Voice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  // 獲取聲音列表
  const voicesQuery = trpc.voice.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 獲取使用者的聲音偏好
  const preferenceQuery = trpc.voice.getPreference.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  // 當偏好資料載入後，設定預設值
  useEffect(() => {
    if (preferenceQuery.data) {
      setHost1Voice(preferenceQuery.data.host1VoiceId || null);
      setHost2Voice(preferenceQuery.data.host2VoiceId || null);
    }
  }, [preferenceQuery.data]);

  // 儲存聲音偏好
  const savePreferenceMutation = trpc.voice.savePreference.useMutation({
    onSuccess: () => {
      toast.success("聲音設定已儲存！");
      preferenceQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "儲存失敗");
    },
  });

  const handleSave = () => {
    if (!host1Voice || !host2Voice) {
      toast.error("請選擇兩個聲音");
      return;
    }
    if (host1Voice === host2Voice) {
      toast.error("請選擇不同的聲音");
      return;
    }
    savePreferenceMutation.mutate({
      host1VoiceId: host1Voice,
      host2VoiceId: host2Voice,
    });
  };

  const playDemo = (demoUrl: string, voiceId: string) => {
    if (playingVoice === voiceId) {
      // 停止播放
      const audio = document.getElementById(`audio-${voiceId}`) as HTMLAudioElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingVoice(null);
    } else {
      // 停止其他正在播放的音訊
      if (playingVoice) {
        const prevAudio = document.getElementById(`audio-${playingVoice}`) as HTMLAudioElement;
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
      }
      // 播放新的音訊
      const audio = document.getElementById(`audio-${voiceId}`) as HTMLAudioElement;
      if (audio) {
        audio.play();
        setPlayingVoice(voiceId);
      }
    }
  };

  if (loading || voicesQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>請先登入</CardTitle>
            <CardDescription>您需要登入才能設定聲音偏好</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const voices = voicesQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Podcast 聲音設定
          </h1>
          <p className="text-gray-600">
            選擇兩個聲音作為 Podcast 的主持人。您可以使用自己 Clone 的聲音或內建聲音。
          </p>
        </div>

        {/* 當前選擇 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>目前選擇</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">主持人 1</h3>
                {host1Voice ? (
                  <p className="text-sm text-blue-700">
                    {voices.find(v => v.speakerId === host1Voice)?.name || host1Voice}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">尚未選擇</p>
                )}
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-semibold text-pink-900 mb-2">主持人 2</h3>
                {host2Voice ? (
                  <p className="text-sm text-pink-700">
                    {voices.find(v => v.speakerId === host2Voice)?.name || host2Voice}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">尚未選擇</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={!host1Voice || !host2Voice || savePreferenceMutation.isPending}
              className="w-full"
            >
              {savePreferenceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                "儲存設定"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 聲音列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              可用聲音 ({voices.length})
            </CardTitle>
            <CardDescription>
              點擊播放圖示試聽聲音，點擊卡片選擇為主持人
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {voices.map((voice) => {
                const isHost1 = host1Voice === voice.speakerId;
                const isHost2 = host2Voice === voice.speakerId;
                const isSelected = isHost1 || isHost2;

                return (
                  <div
                    key={voice.speakerId}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? isHost1
                          ? "border-blue-500 bg-blue-50"
                          : "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    onClick={() => {
                      if (isHost1) {
                        setHost1Voice(null);
                      } else if (isHost2) {
                        setHost2Voice(null);
                      } else if (!host1Voice) {
                        setHost1Voice(voice.speakerId);
                      } else if (!host2Voice) {
                        setHost2Voice(voice.speakerId);
                      } else {
                        toast.info("已選擇兩個聲音，請先取消其中一個");
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{voice.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {voice.gender === "male" ? "男聲" : "女聲"}
                          </Badge>
                          {isSelected && (
                            <Badge className={isHost1 ? "bg-blue-500" : "bg-pink-500"}>
                              {isHost1 ? "主持人 1" : "主持人 2"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-green-600" />}
                    </div>

                    {voice.demoAudioUrl && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            playDemo(voice.demoAudioUrl, voice.speakerId);
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {playingVoice === voice.speakerId ? "停止" : "試聽"}
                        </Button>
                        <audio
                          id={`audio-${voice.speakerId}`}
                          src={voice.demoAudioUrl}
                          onEnded={() => setPlayingVoice(null)}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {voices.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Headphones className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>找不到可用的聲音</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
