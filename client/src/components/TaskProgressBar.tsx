import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface TaskProgressBarProps {
  stage: string;
  percent: number;
  message: string;
  estimatedTimeRemaining?: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  queued: "排隊中",
  downloading: "下載中",
  transcribing: "轉錄中",
  analyzing: "分析中",
  generating: "生成中",
  completed: "完成",
  failed: "失敗",
};

const STAGE_COLORS: Record<string, string> = {
  queued: "text-gray-600",
  downloading: "text-blue-600",
  transcribing: "text-purple-600",
  analyzing: "text-yellow-600",
  generating: "text-green-600",
  completed: "text-green-700",
  failed: "text-red-600",
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} 秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} 分鐘`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} 小時 ${minutes} 分鐘`;
  }
}

export function TaskProgressBar({ stage, percent, message, estimatedTimeRemaining }: TaskProgressBarProps) {
  const stageLabel = STAGE_LABELS[stage] || stage;
  const stageColor = STAGE_COLORS[stage] || "text-gray-600";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {stage !== "completed" && stage !== "failed" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span className={`font-medium ${stageColor}`}>{stageLabel}</span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
          <span className="text-xs text-muted-foreground">
            預估剩餘 {formatTime(estimatedTimeRemaining)}
          </span>
        )}
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
