/**
 * FlowSpeech 服務
 * 使用 ListenHub FlowSpeech API 生成簡單的 TTS（直接讀出文字，不轉換成對話）
 * 用於生成開場和結尾
 */

const LISTENHUB_API_BASE = "https://api.marswave.ai/openapi/v1";
const API_KEY = process.env.LISTENHUB_API_KEY;

export interface FlowSpeechResponse {
  audioUrl?: string;
  taskId?: string;
  status?: string;
  episodeId?: string;
}

/**
 * 使用 FlowSpeech API 生成簡單的 TTS（直接讀出文字）
 * 嘗試多個可能的 API 端點
 */
export async function generateFlowSpeech(
  text: string,
  speakerId: string,
  language: "zh" | "en" = "zh"
): Promise<FlowSpeechResponse> {
  if (!API_KEY) {
    throw new Error("ListenHub API Key not configured");
  }

  // 嘗試多個可能的 FlowSpeech API 端點和參數組合
  const possibleEndpoints = [
    // 策略 1: 獨立的 FlowSpeech 端點
    { path: "/flowspeech/generate", body: { text, speakerId, language } },
    { path: "/flowspeech/create", body: { text, speakerId, language } },
    { path: "/flowspeech/tts", body: { text, speakerId, language } },
    { path: "/tts/flowspeech", body: { text, speakerId, language } },
    { path: "/tts/generate", body: { text, speakerId, language } },
    { path: "/flowspeech", body: { text, speakerId, language } },
    
    // 策略 2: 使用 podcast/episodes 端點，但添加 type 參數（優先嘗試）
    { path: "/podcast/episodes", body: { query: text, speakers: [{ speakerId }], language: language, mode: "quick", type: "flowspeech" } },
    { path: "/podcast/episodes", body: { query: text, speakers: [{ speakerId }], language: language, mode: "quick", format: "flowspeech" } },
    { path: "/podcast/episodes", body: { query: text, speakers: [{ speakerId }], language: language, mode: "quick", format: "narration" } },
    
    // 策略 3: 使用 podcast/episodes 端點，單一 speaker + 極明確的旁白 prompt（優先於純文字）
    { path: "/podcast/episodes", body: { query: `【旁白模式：直接讀出以下文字，不要轉換成對話格式，不要添加任何對話元素】\n\n${text}`, speakers: [{ speakerId }], language: language, mode: "quick" } },
    
    // 策略 4: 使用 podcast/episodes 端點，單一 speaker + 簡單旁白標記
    { path: "/podcast/episodes", body: { query: `旁白：${text}`, speakers: [{ speakerId }], language: language, mode: "quick" } },
    
    // 策略 5: 使用 podcast/episodes 端點，單一 speaker（最後嘗試，可能仍會轉換成對話）
    { path: "/podcast/episodes", body: { query: text, speakers: [{ speakerId }], language: language, mode: "quick" } },
  ];

  let lastError: Error | null = null;

  for (const { path, body } of possibleEndpoints) {
    try {
      console.log(`[FlowSpeech] Trying endpoint: ${path}`);
      
      const response = await fetch(`${LISTENHUB_API_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        console.log(`[FlowSpeech] Endpoint ${path} returned non-JSON: ${responseText.substring(0, 200)}`);
        continue;
      }

      if (response.ok && (data.code === 0 || data.audioUrl || data.data?.audioUrl || data.data?.episodeId)) {
        console.log(`[FlowSpeech] ✅ Success with endpoint: ${path}`);
        console.log(`[FlowSpeech] Request body used: ${JSON.stringify(body).substring(0, 200)}...`);
        
        // 如果有 episodeId，需要等待完成
        if (data.data?.episodeId) {
          const { waitForPodcastCompletion } = await import("../listenHubService");
          const episode = await waitForPodcastCompletion(data.data.episodeId);
          console.log(`[FlowSpeech] Episode completed. Audio URL: ${episode.audioUrl}`);
          return {
            audioUrl: episode.audioUrl,
            episodeId: episode.episodeId,
            status: episode.processStatus,
          };
        }
        
        return {
          audioUrl: data.data?.audioUrl || data.audioUrl,
          taskId: data.data?.taskId || data.taskId,
          status: data.data?.status || data.status,
        };
      } else {
        console.log(`[FlowSpeech] Endpoint ${path} failed: ${response.status} - ${data.message || responseText.substring(0, 100)}`);
        if (data.message) {
          console.log(`[FlowSpeech] Error details: ${JSON.stringify(data)}`);
        }
      }
    } catch (error) {
      console.log(`[FlowSpeech] Endpoint ${path} error:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // 如果所有端點都失敗，拋出錯誤
  throw new Error(
    `FlowSpeech API not found. Tried ${possibleEndpoints.length} endpoints. ` +
    `Please check ListenHub API documentation or contact support for the correct FlowSpeech endpoint. ` +
    `Last error: ${lastError?.message || "Unknown error"}`
  );
}

