/**
 * Podcast 精華片段識別服務
 * 使用 LLM 分析 Podcast 文字稿，找出最精彩的片段
 */

import { invokeLLM } from "../_core/llm";

export interface HighlightSegment {
  title: string; // 精華片段標題
  description: string; // 精華片段描述
  startTime: number; // 開始時間（秒）
  endTime: number; // 結束時間（秒）
  duration: number; // 持續時間（秒）
  transcript: string; // 精華片段的文字內容
  reason: string; // 為什麼這段是精華（內部使用）
}

export interface PodcastScript {
  speakerId: string;
  speakerName: string;
  content: string;
}

/**
 * 分析 Podcast 文字稿，識別精華片段
 * @param scripts Podcast 對話腳本
 * @param targetDuration 目標精華片段總長度（秒），預設 60 秒
 * @returns 精華片段列表
 */
export async function identifyHighlights(
  scripts: PodcastScript[],
  targetDuration: number = 60
): Promise<HighlightSegment[]> {
  if (!scripts || scripts.length === 0) {
    throw new Error("Podcast scripts are empty");
  }

  // 將對話腳本轉換為帶時間戳的文字
  const fullTranscript = scripts
    .map((script, index) => `[${index}] ${script.speakerName}: ${script.content}`)
    .join("\n");

  // 使用 LLM 分析文字稿，找出精華片段
  const prompt = `你是一位專業的 Podcast 編輯，擅長從完整的 Podcast 中找出最精彩的片段。

請分析以下 Podcast 文字稿，找出 2-3 個最精彩的片段，總長度約 ${targetDuration} 秒。

精華片段的標準：
1. **高潮時刻**：討論最激烈、最有趣的部分
2. **金句**：有洞見、有啟發性的觀點
3. **重點總結**：清晰總結核心概念的部分
4. **情感共鳴**：能引起聽眾共鳴的故事或例子

Podcast 文字稿：
${fullTranscript}

請以 JSON 格式回傳精華片段列表，每個片段包含：
- title: 精華片段標題（簡短有吸引力，10-20 字）
- description: 精華片段描述（說明為什麼這段精彩，30-50 字）
- startIndex: 開始的對話索引（對應 [數字]）
- endIndex: 結束的對話索引（對應 [數字]）
- reason: 選擇這段的理由（內部使用）

重要限制：
- **每個精華片段的長度不能超過 60 秒**（用於生成虛擬主播影片）
- 每個片段應該是完整的對話片段，不要在句子中間切斷
- 片段之間不要重疊
- 優先選擇最精彩的部分，而不是平均分配

**重要**：你必須直接返回純 JSON 格式，不要使用 markdown 代碼塊（不要使用 \`\`\`json 或 \`\`\`）。

請只回傳 JSON 格式，不要包含其他文字或 markdown 代碼塊。`;

  // 每個精華片段的最大長度（秒）
  // Kling AI API 要求音訊時長必須在 2-60 秒之間，設定為 59 秒留出安全邊界
  const MAX_HIGHLIGHT_DURATION = 59;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一位專業的 Podcast 編輯，擅長識別精華片段。**重要**：你必須直接返回純 JSON 格式，不要使用 markdown 代碼塊（不要使用 \`\`\`json 或 \`\`\`）。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "highlight_segments",
          strict: true,
          schema: {
            type: "object",
            properties: {
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    startIndex: { type: "integer" },
                    endIndex: { type: "integer" },
                    reason: { type: "string" },
                  },
                  required: ["title", "description", "startIndex", "endIndex", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["segments"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response is empty");
    }

    // 確保 content 是字串
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // 清理和提取 JSON 的輔助函數（改進版，處理 markdown 代碼塊和數組格式）
    const cleanJsonString = (text: string): string => {
      // 1. 移除所有 markdown 代碼塊標記（```json ... ``` 或 ``` ... ```）
      let cleaned = text
        .replace(/^[\s\n]*```(?:json)?[\s\n]*/i, '')
        .replace(/[\s\n]*```[\s\n]*$/i, '')
        .replace(/```(?:json)?[\s\n]*/gi, '');
      
      // 2. 移除控制字符（但保留常見的轉義字符）
      cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      
      // 3. 找到 JSON 的開始和結束位置（可能是對象 {} 或數組 []）
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      
      // 確定是對象還是數組
      let startPos = -1;
      let endPos = -1;
      
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        // 數組格式
        startPos = firstBracket;
        endPos = lastBracket;
      } else if (firstBrace !== -1) {
        // 對象格式
        startPos = firstBrace;
        endPos = lastBrace;
      }
      
      if (startPos !== -1 && endPos !== -1 && endPos > startPos) {
        cleaned = cleaned.substring(startPos, endPos + 1);
      }
      
      // 4. 移除前後空白
      cleaned = cleaned.trim();
      
      return cleaned;
    };
    
    // 嘗試解析 JSON
    let result;
    try {
      const cleanedContent = cleanJsonString(contentStr);
      const parsed = JSON.parse(cleanedContent);
      
      // **關鍵修復**：如果返回的是數組，自動包裝成 {segments: [...]} 格式
      if (Array.isArray(parsed)) {
        result = { segments: parsed };
      } else if (parsed.segments && Array.isArray(parsed.segments)) {
        // 已經是正確格式
        result = parsed;
      } else {
        // 嘗試從對象中提取數組
        const segments = parsed.segments || parsed.highlights || parsed.items || [];
        if (Array.isArray(segments)) {
          result = { segments };
        } else {
          throw new Error("LLM 回應格式不正確：找不到 segments 數組");
        }
      }
    } catch (parseError) {
      // 如果解析失敗，嘗試提取 JSON 部分
      try {
        // 先移除 markdown 代碼塊
        let cleanedResponse = contentStr
          .replace(/^[\s\n]*```(?:json)?[\s\n]*/i, '')
          .replace(/[\s\n]*```[\s\n]*$/i, '')
          .replace(/```(?:json)?[\s\n]*/gi, '');
        
        // 找到 JSON 的範圍（可能是對象或數組）
        const firstBrace = cleanedResponse.indexOf('{');
        const firstBracket = cleanedResponse.indexOf('[');
        const lastBrace = cleanedResponse.lastIndexOf('}');
        const lastBracket = cleanedResponse.lastIndexOf(']');
        
        let startPos = -1;
        let endPos = -1;
        
        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
          startPos = firstBracket;
          endPos = lastBracket;
        } else if (firstBrace !== -1) {
          startPos = firstBrace;
          endPos = lastBrace;
        }
        
        if (startPos !== -1 && endPos !== -1 && endPos > startPos) {
          cleanedResponse = cleanedResponse.substring(startPos, endPos + 1);
        }
        
        // 再次嘗試解析
        const parsed = JSON.parse(cleanedResponse);
        
        // 處理數組格式
        if (Array.isArray(parsed)) {
          result = { segments: parsed };
        } else if (parsed.segments && Array.isArray(parsed.segments)) {
          result = parsed;
        } else {
          throw new Error("LLM 回應格式不正確：找不到 segments 數組");
        }
      } catch (extractError) {
        console.error(`[HighlightService] JSON parsing failed. Content preview: ${contentStr.substring(0, 500)}`);
        throw new Error(`無法解析 LLM 回應為 JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    }
    const segments: HighlightSegment[] = [];

    // 估算每個對話的平均時長（假設每個字 0.3 秒）
    const avgSecondsPerChar = 0.3;

    for (const segment of result.segments) {
      const { title, description, startIndex, endIndex, reason } = segment;

      // 提取對應的文字內容
      const segmentScripts = scripts.slice(startIndex, endIndex + 1);
      const transcript = segmentScripts
        .map((s) => `${s.speakerName}: ${s.content}`)
        .join("\n");

      // 計算開始和結束時間
      const previousChars = scripts
        .slice(0, startIndex)
        .reduce((sum, s) => sum + s.content.length, 0);
      const startTime = Math.floor(previousChars * avgSecondsPerChar);
      
      // 計算時間（基於文字長度估算）
      const charCount = transcript.length;
      let estimatedDuration = Math.ceil(charCount * avgSecondsPerChar);
      
      // 限制精華片段最多 59 秒（Kling AI API 要求 2-60 秒，留出安全邊界）
      // 重要：必須同時調整 duration 和 endTime，確保實際剪輯的音訊也不超過 59 秒
      if (estimatedDuration > MAX_HIGHLIGHT_DURATION) {
        console.warn(`[HighlightService] Highlight duration (${estimatedDuration}s) exceeds limit (${MAX_HIGHLIGHT_DURATION}s), truncating`);
        estimatedDuration = MAX_HIGHLIGHT_DURATION;
      }
      
      // endTime 必須基於截斷後的 duration 計算，確保實際音訊長度不超過 60 秒
      const endTime = startTime + estimatedDuration;

      segments.push({
        title,
        description,
        startTime,
        endTime,
        duration: estimatedDuration,
        transcript,
        reason,
      });
    }

    return segments;
  } catch (error) {
    console.error("[HighlightService] Failed to identify highlights:", error);
    throw new Error(`Failed to identify highlights: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * 從完整的 Podcast 音檔中提取精華片段的時間範圍
 * @param podcastDuration Podcast 總長度（秒）
 * @param scripts Podcast 對話腳本
 * @returns 精華片段時間範圍列表
 */
export async function getHighlightTimeRanges(
  podcastDuration: number,
  scripts: PodcastScript[]
): Promise<Array<{ start: number; end: number; title: string }>> {
  const highlights = await identifyHighlights(scripts);

  return highlights.map((h) => ({
    start: h.startTime,
    end: h.endTime,
    title: h.title,
  }));
}
