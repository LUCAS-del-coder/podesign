import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Youtube, 
  Headphones, 
  FileText, 
  Download, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Sparkles,
  Music,
  Video,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { TaskProgressBar } from "@/components/TaskProgressBar";
import { AvatarVideoPlayer } from "@/components/AvatarVideoPlayer";

// 進度顯示組件
function TaskProgressDisplay({ taskId }: { taskId: number }) {
  const { data: progress, isLoading } = trpc.podcast.getProgress.useQuery(
    { taskId },
    {
      refetchInterval: (query) => {
        // 如果任務已完成或失敗，停止輪詢
        const data = query.state.data;
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        // 否則每 2 秒輪詢一次
        return 2000;
      },
    }
  );

  if (isLoading || !progress) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>載入中...</span>
      </div>
    );
  }

  return (
    <TaskProgressBar
      stage={progress.stage}
      percent={progress.percent}
      message={progress.message}
      estimatedTimeRemaining={progress.estimatedTimeRemaining}
    />
  );
}

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [generatingHighlights, setGeneratingHighlights] = useState<Set<number>>(new Set());
  const [taskHighlights, setTaskHighlights] = useState<Map<number, any[]>>(new Map());
  const [processingTasks, setProcessingTasks] = useState<Set<number>>(new Set());


  const generateHighlightsMutation = trpc.podcast.generateHighlights.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`已生成 ${data.highlights.length} 個精華片段！`);
      setGeneratingHighlights(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.taskId);
        return newSet;
      });
      // 重新獲取任務列表
      taskListQuery.refetch();
    },
    onError: (error, variables) => {
      toast.error(`生成精華片段失敗：${error.message}`);
      setGeneratingHighlights(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.taskId);
        return newSet;
      });
    },
  });

  const handleGenerateHighlights = (taskId: number) => {
    setGeneratingHighlights(prev => new Set(prev).add(taskId));
    generateHighlightsMutation.mutate({ taskId });
  };

  const deleteTaskMutation = trpc.podcast.delete.useMutation({
    onSuccess: () => {
      toast.success("任務已刪除！");
      taskListQuery.refetch();
    },
    onError: (error) => {
      toast.error(`刪除任務失敗：${error.message}`);
    },
  });

  const handleDeleteTask = (taskId: number) => {
    if (confirm("確定要刪除這個任務嗎？這將同時刪除所有精華片段和虛擬主播影片。")) {
      deleteTaskMutation.mutate({ taskId });
    }
  };

  const deleteMutation = trpc.podcast.deleteHighlight.useMutation({
    onSuccess: () => {
      toast.success("精華片段已刪除");
      // 重新載入所有任務
      taskListQuery.refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });



  // 獲取 tRPC utils
  const utils = trpc.useUtils();

  // 當任務展開時，獲取它的精華片段
  useEffect(() => {
    expandedTasks.forEach(async (taskId) => {
      if (!taskHighlights.has(taskId)) {
        try {
          const data = await utils.podcast.getHighlights.fetch({ taskId });
          setTaskHighlights(prev => new Map(prev).set(taskId, data));
        } catch (error) {
          console.error('Failed to fetch highlights:', error);
        }
      }
    });
  }, [expandedTasks, user, utils]);

  const taskListQuery = trpc.podcast.list.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000,
  });

  const toggleTaskExpanded = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "等待中", variant: "secondary" as const },
      processing: { label: "處理中", variant: "default" as const },
      completed: { label: "已完成", variant: "default" as const },
      failed: { label: "失敗", variant: "destructive" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFilteredAndSortedTasks = () => {
    if (!taskListQuery.data) return [];
    
    let filtered = taskListQuery.data;
    if (filterStatus !== "all") {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  };

  const filteredTasks = getFilteredAndSortedTasks();

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
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">請先登入</p>
            <p className="text-sm text-muted-foreground mb-4">
              登入後即可查看您的 Podcast 製作記錄
            </p>
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
      <div className="container max-w-6xl py-4 md:py-12 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Podcast</h1>
            <p className="text-muted-foreground mt-1">
              {taskListQuery.data && `共 ${filteredTasks.length} 個任務`}
            </p>
          </div>

          {taskListQuery.data && taskListQuery.data.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="processing">處理中</SelectItem>
                  <SelectItem value="failed">失敗</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新優先</SelectItem>
                  <SelectItem value="oldest">最舊優先</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Task List */}
        {taskListQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !filteredTasks || filteredTasks.length === 0 ? (
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Youtube className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">還沒有任何記錄</p>
              <p className="text-sm text-muted-foreground">
                前往工作區建立您的第一個 Podcast 任務
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => {
              const taskKey = task.id ?? task.youtubeUrl;
              const isExpanded = expandedTasks.has(task.id!);
              
              return (
                <Card 
                  key={taskKey} 
                  className="shadow-lg border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur hover:shadow-xl transition-all overflow-hidden group"
                >
                  {/* Card Image/Icon */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-pink-950/40 flex items-center justify-center">
                    <Headphones className="h-16 w-16 text-primary/40" />
                    <div className="absolute top-4 right-4">
                      {getStatusBadge(task.status)}
                    </div>
                    {task.status === "completed" && task.podcastAudioUrl && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-4 bg-white/90 dark:bg-black/90 rounded-full">
                            <Play className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        {task.title ? (
                          <>
                            <h3 className="font-semibold line-clamp-2 leading-tight">{task.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.youtubeUrl}
                            </p>
                          </>
                        ) : (
                          <a
                            href={task.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline line-clamp-2 font-medium"
                          >
                            {task.youtubeUrl}
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleString("zh-TW", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTask(task.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  {/* 進度顯示 */}
                  {task.status === "processing" && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        <TaskProgressDisplay taskId={task.id!} />
                      </CardContent>
                    </>
                  )}

                  {task.status === "failed" && task.errorMessage && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">{task.errorMessage}</p>
                        </div>
                      </CardContent>
                    </>
                  )}

                  {task.status === "completed" && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTaskExpanded(task.id!)}
                          className="w-full"
                        >
                          {isExpanded ? (
                            <>
                              收起詳情
                              <ChevronUp className="h-4 w-4 ml-2" />
                            </>
                          ) : (
                            <>
                              查看詳情
                              <ChevronDown className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <div className="mt-4 space-y-4">
                            {task.podcastAudioUrl && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Headphones className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Podcast 音檔</span>
                                </div>
                                <audio controls className="w-full">
                                  <source src={task.podcastAudioUrl} type="audio/mpeg" />
                                </audio>
                              </div>
                            )}

                            {task.summary && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">摘要</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadText(task.summary!, "摘要.txt")}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-xs max-h-32 overflow-y-auto">
                                  {task.summary}
                                </div>
                              </div>
                            )}

                            {/* 精華片段顯示 */}
                            {taskHighlights.get(task.id!) && taskHighlights.get(task.id!)!.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Music className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">精華片段</span>
                                </div>
                                {taskHighlights.get(task.id!)!.map((highlight: any, index: number) => (
                                  <div key={highlight.id} className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg space-y-2 overflow-hidden">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0 max-w-full">
                                        <h4 className="text-sm font-medium" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>{highlight.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-1" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>{highlight.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          長度：{Math.floor(highlight.duration / 60)}:{(highlight.duration % 60).toString().padStart(2, '0')}
                                        </p>
                                      </div>
                                    </div>
                                    {highlight.audioUrl ? (
                                      <audio controls className="w-full h-8">
                                        <source src={highlight.audioUrl} type="audio/mpeg" />
                                      </audio>
                                    ) : (
                                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                                          ⚠️ 音檔缺失，無法播放（可能是舊版本生成的精華片段）
                                        </p>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => {
                                            if (confirm('確定要刪除這個精華片段嗎？建議刪除後重新生成。')) {
                                              deleteMutation.mutate({ highlightId: highlight.id });
                                            }
                                          }}
                                        >
                                          刪除缺失音檔的精華片段
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {/* 虛擬主播影片播放器 */}
                                    <AvatarVideoPlayer 
                                      highlightId={highlight.id} 
                                      highlight={{
                                        duration: highlight.duration,
                                        title: highlight.title
                                      }}
                                    />

                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 精華片段生成按鈕 */}
                            {(!taskHighlights.get(task.id!) || taskHighlights.get(task.id!)!.length === 0) && (
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleGenerateHighlights(task.id!)}
                                  disabled={generatingHighlights.has(task.id!)}
                                >
                                  {generatingHighlights.has(task.id!) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      正在生成精華版本...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      生成精華版本
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}
