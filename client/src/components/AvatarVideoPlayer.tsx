import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Download, Play, Pause, Video } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarVideoPlayerProps {
  highlightId: number;
  highlight: {
    duration: number;
    title: string;
  };
}

export function AvatarVideoPlayer({ highlightId, highlight }: AvatarVideoPlayerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollingTaskId, setPollingTaskId] = useState<number | null>(null);

  // 獲取精華片段的虛擬主播影片
  const { data: videos, refetch } = trpc.podcast.getHighlightAvatarVideos.useQuery(
    { highlightId },
    {
      refetchInterval: pollingTaskId ? 5000 : false, // 如果有正在處理的任務，每 5 秒輪詢一次
    }
  );

  // 生成虛擬主播影片
  const generateMutation = trpc.podcast.generateAvatarVideo.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setPollingTaskId(data.taskId);
      setIsGenerating(true);
      refetch();
    },
    onError: (error) => {
      toast.error(`影片生成失敗：${error.message}`);
      setIsGenerating(false);
    },
  });

  // 檢查是否有正在處理的任務
  useEffect(() => {
    if (videos && videos.length > 0) {
      const processingTask = videos.find(
        (v) => v.status === 'pending' || v.status === 'submitted' || v.status === 'processing'
      );
      
      if (processingTask) {
        setPollingTaskId(processingTask.id);
        setIsGenerating(true);
      } else {
        setPollingTaskId(null);
        setIsGenerating(false);
      }
    }
  }, [videos]);

  const handleGenerate = (mode: 'std' | 'pro' = 'std') => {
    // 驗證音訊時長（Kling AI API 要求 2-60 秒）
    if (highlight.duration < 2) {
      toast.error('音訊時長太短，必須至少 2 秒');
      return;
    }
    if (highlight.duration > 60) {
      toast.error('音訊時長超過 60 秒，無法生成虛擬主播影片。請重新生成精華片段。');
      return;
    }
    
    generateMutation.mutate({
      highlightId,
      mode,
    });
  };

  const handleDownload = (videoUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${title}-avatar-video.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 找到最新的已完成影片
  const completedVideo = videos?.find((v) => v.status === 'completed' && v.videoUrl);
  const processingVideo = videos?.find(
    (v) => v.status === 'pending' || v.status === 'submitted' || v.status === 'processing'
  );
  const failedVideo = videos?.find((v) => v.status === 'failed');

  return (
    <div className="space-y-4">
      {/* 生成按鈕 */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleGenerate('std')}
          disabled={isGenerating || generateMutation.isPending}
          variant="default"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              生成虛擬主播影片（標準）
            </>
          )}
        </Button>
        <Button
          onClick={() => handleGenerate('pro')}
          disabled={isGenerating || generateMutation.isPending}
          variant="outline"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              生成虛擬主播影片（專業）
            </>
          )}
        </Button>
      </div>

      {/* 處理中的任務 */}
      {processingVideo && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                虛擬主播影片生成中...
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {processingVideo.statusMessage || '請稍候，這可能需要幾分鐘時間'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                模式：{processingVideo.mode === 'pro' ? '專業' : '標準'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 失敗的任務 */}
      {failedVideo && !processingVideo && (
        <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-100">
                影片生成失敗
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {failedVideo.errorMessage || '未知錯誤'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 已完成的影片 */}
      {completedVideo && completedVideo.videoUrl && (
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Video className="h-5 w-5" />
            虛擬主播影片
          </h4>
          <div className="space-y-3">
            <video
              src={completedVideo.videoUrl}
              controls
              className="w-full rounded-lg"
              preload="metadata"
            >
              您的瀏覽器不支援影片播放
            </video>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                時長：{completedVideo.duration ? `${completedVideo.duration} 秒` : '未知'}
              </span>
              <span>
                模式：{completedVideo.mode === 'pro' ? '專業' : '標準'}
              </span>
            </div>
            <Button
              onClick={() => handleDownload(completedVideo.videoUrl!, `highlight-${highlightId}`)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              下載影片
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
