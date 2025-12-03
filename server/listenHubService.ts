/**
 * ListenHub API Integration Service
 * 用於生成中文男女對話 Podcast
 */

const LISTENHUB_API_BASE = "https://api.marswave.ai/openapi/v1";
const API_KEY = process.env.LISTENHUB_API_KEY;

if (!API_KEY) {
  console.warn("[ListenHub] API Key not configured");
}

export interface ListenHubSpeaker {
  name: string;
  speakerId: string;
  demoAudioUrl: string;
  gender: "male" | "female";
  language: string;
}

export interface CreatePodcastRequest {
  query: string; // 內容文字（摘要或腳本）
  speakers: Array<{ speakerId: string }>;
  language: "zh" | "en";
  mode: "quick" | "deep" | "debate";
  type?: "podcast" | "flowspeech" | "narration"; // 可能的類型參數
  format?: "dialogue" | "narration" | "flowspeech"; // 可能的格式參數
}

export interface PodcastEpisode {
  episodeId: string;
  processStatus: "pending" | "success" | "failed";
  title?: string;
  audioUrl?: string;
  audioStreamUrl?: string;
  scripts?: Array<{
    speakerId: string;
    speakerName: string;
    content: string;
  }>;
  credits?: number;
  failCode?: number;
}

/**
 * 獲取所有可用的聲音列表（包含 Clone 的聲音）
 */
export async function getVoices(): Promise<ListenHubSpeaker[]> {
  if (!API_KEY) {
    throw new Error("ListenHub API Key not configured");
  }

  try {
    const response = await fetch(`${LISTENHUB_API_BASE}/speakers/list?language=zh`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`ListenHub API error: ${data.message}`);
    }
    
    // API 回應格式：{ code: 0, data: { items: [...] } }
    return data.data?.items || [];
  } catch (error) {
    console.error("[ListenHub] Failed to fetch voices:", error);
    throw error;
  }
}

/**
 * 獲取可用的中文聲音列表（舊版函數，保留相容性）
 */
export async function getChineseSpeakers(): Promise<ListenHubSpeaker[]> {
  if (!API_KEY) {
    throw new Error("ListenHub API Key not configured");
  }

  const response = await fetch(
    `${LISTENHUB_API_BASE}/speakers/list?language=zh`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch speakers: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`ListenHub API error: ${data.message}`);
  }

  return data.data.items;
}

/**
 * 選擇一男一女聲音（用於對話）
 */
export async function selectMaleFemaleSpeakers(): Promise<{
  male: ListenHubSpeaker;
  female: ListenHubSpeaker;
}> {
  const speakers = await getChineseSpeakers();

  const males = speakers.filter((s) => s.gender === "male");
  const females = speakers.filter((s) => s.gender === "female");

  if (males.length === 0 || females.length === 0) {
    throw new Error("No male or female speakers available");
  }

  // 選擇第一個男聲和女聲
  return {
    male: males[0],
    female: females[0],
  };
}

/**
 * 創建 Podcast Episode
 */
export async function createPodcastEpisode(
  request: CreatePodcastRequest
): Promise<string> {
  if (!API_KEY) {
    throw new Error("ListenHub API Key not configured");
  }

  const response = await fetch(`${LISTENHUB_API_BASE}/podcast/episodes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create podcast: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`ListenHub API error: ${data.message}`);
  }

  return data.data.episodeId;
}

/**
 * 查詢 Episode 狀態
 */
export async function getPodcastEpisode(
  episodeId: string
): Promise<PodcastEpisode> {
  if (!API_KEY) {
    throw new Error("ListenHub API Key not configured");
  }

  const response = await fetch(
    `${LISTENHUB_API_BASE}/podcast/episodes/${episodeId}`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get episode: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`ListenHub API error: ${data.message}`);
  }

  return data.data;
}

/**
 * 輪詢等待 Episode 完成（優化版本：更快的響應速度）
 * @param episodeId Episode ID
 * @param maxWaitTime 最長等待時間（毫秒），預設 30 分鐘（增加超時時間）
 * @returns 完成的 Episode
 */
export async function waitForPodcastCompletion(
  episodeId: string,
  maxWaitTime: number = 30 * 60 * 1000 // 30 minutes (增加超時時間)
): Promise<PodcastEpisode> {
  const startTime = Date.now();

  console.log(`[ListenHub] Waiting for episode ${episodeId} to complete... (max wait: ${maxWaitTime / 1000 / 60} minutes)`);

  // 優化：減少初始等待時間（從 30 秒改為 10 秒）
  // 因為 ListenHub 通常在 30-60 秒內完成 quick 模式，但我們可以更快地開始檢查
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // 使用動態輪詢間隔：開始時頻繁查詢，之後逐漸延長
  let pollInterval = 5000; // 初始 5 秒
  let consecutivePendingCount = 0;
  let lastStatus: string | undefined;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const episode = await getPodcastEpisode(episodeId);
      
      // 記錄狀態變化（使用適當的日誌級別）
      if (episode.processStatus !== lastStatus) {
        if (episode.processStatus === "failed") {
          // 失敗狀態使用 warn 級別（會顯示為黃色/橙色，而不是紅色錯誤）
          const failInfo = episode.failCode 
            ? ` (failCode: ${episode.failCode})`
            : '';
          console.warn(`[ListenHub] ⚠️  Episode ${episodeId} status changed: ${lastStatus || 'unknown'} -> ${episode.processStatus}${failInfo}`);
        } else if (episode.processStatus === "success") {
          // 成功狀態使用 info 級別
          console.log(`[ListenHub] ✅ Episode ${episodeId} status changed: ${lastStatus || 'unknown'} -> ${episode.processStatus}`);
        } else {
          // 其他狀態使用 info 級別
          console.log(`[ListenHub] ℹ️  Episode ${episodeId} status changed: ${lastStatus || 'unknown'} -> ${episode.processStatus}`);
        }
        lastStatus = episode.processStatus;
      }

      if (episode.processStatus === "success") {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`[ListenHub] ✅ Episode ${episodeId} completed successfully in ${elapsed}s`);
        return episode;
      }

      if (episode.processStatus === "failed") {
        // 記錄詳細的失敗信息
        const failInfo = episode.failCode 
          ? ` (failCode: ${episode.failCode})`
          : '';
        const errorMsg = `Episode generation failed${failInfo}. This may be due to content issues, API limits, or temporary service problems.`;
        
        // 使用 warn 而不是 error，因為這可能是暫時的問題
        console.warn(`[ListenHub] ⚠️  ${errorMsg}`);
        
        // 立即拋出錯誤，不要繼續等待（failed 狀態不會恢復）
        throw new Error(errorMsg);
      }

      // 如果仍然是 pending，增加計數
      consecutivePendingCount++;
      
      // 動態調整輪詢間隔（優化：更快的響應速度）：
      // - 前 5 次：每 3 秒查詢（快速響應）
      // - 6-15 次：每 5 秒查詢（正常速度）
      // - 之後：每 10 秒查詢（節省 API 調用）
      if (consecutivePendingCount <= 5) {
        pollInterval = 3000; // 3 秒（更快）
      } else if (consecutivePendingCount <= 15) {
        pollInterval = 5000; // 5 秒
      } else {
        pollInterval = 10000; // 10 秒
      }

      const elapsed = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const remainingSeconds = elapsedSeconds % 60;
      
      // 每 5 分鐘輸出一次詳細狀態，或者狀態為 failed 時也輸出
      if (elapsedSeconds % 300 === 0 || consecutivePendingCount === 1 || episode.processStatus === "failed") {
        const statusEmoji = episode.processStatus === "failed" ? "⚠️" : episode.processStatus === "success" ? "✅" : "⏳";
        console.log(`[ListenHub] ${statusEmoji} Episode ${episodeId} still processing... (${elapsedMinutes}m ${remainingSeconds}s elapsed, status: ${episode.processStatus}, checking again in ${pollInterval/1000}s)`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      // 如果錯誤是 episode failed，立即重新拋出（不要繼續重試）
      if (error instanceof Error && error.message.includes("Episode generation failed")) {
        throw error;
      }
      
      // 如果查詢失敗，記錄錯誤但繼續重試（可能是暫時的網路問題）
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.warn(`[ListenHub] ⚠️  Error checking episode ${episodeId} status (${elapsed}s elapsed):`, error instanceof Error ? error.message : String(error));
      
      // 如果錯誤持續超過 5 分鐘，可能 API 有問題
      if (elapsed > 300) {
        console.error(`[ListenHub] ❌ Persistent errors checking episode status, may indicate API issue`);
      }
      
      // 等待後重試
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  // 超時前，最後一次檢查狀態
  try {
    const finalEpisode = await getPodcastEpisode(episodeId);
    if (finalEpisode.processStatus === "success") {
      console.log(`[ListenHub] ✅ Episode ${episodeId} completed on final check`);
      return finalEpisode;
    }
    if (finalEpisode.processStatus === "failed") {
      throw new Error(`Episode generation failed with code: ${finalEpisode.failCode}`);
    }
  } catch (error) {
    console.error(`[ListenHub] ❌ Final check failed:`, error);
  }

  const elapsedMinutes = Math.floor((Date.now() - startTime) / 1000 / 60);
  throw new Error(`Episode generation timeout after ${elapsedMinutes} minutes. Episode may still be processing on ListenHub side.`);
}

/**
 * 一鍵生成中文對話 Podcast
 * @param content 內容文字（摘要或腳本）
 * @param mode 生成模式
 * @param customVoiceIds 自訂聲音 ID（可選）
 * @returns 完成的 Episode（包含音檔 URL）
 */
export async function generateChinesePodcast(
  content: string,
  mode: "quick" | "medium" | "deep" = "deep",
  customVoiceIds?: { host1: string; host2: string }
): Promise<PodcastEpisode> {
  let speakerIds: string[];
  
  if (customVoiceIds) {
    // 使用使用者選擇的聲音
    speakerIds = [customVoiceIds.host1, customVoiceIds.host2];
    console.log(
      `[ListenHub] Using custom voices: ${customVoiceIds.host1} and ${customVoiceIds.host2}`
    );
  } else {
    // 使用預設聲音（一男一女）
    const { male, female } = await selectMaleFemaleSpeakers();
    speakerIds = [male.speakerId, female.speakerId];
    console.log(
      `[ListenHub] Selected speakers: ${male.name} (male) and ${female.name} (female)`
    );
  }

  // 2. 創建 Episode
  // ListenHub API 只支援 quick 和 deep，medium 映射為 quick
  const apiMode = mode === "deep" ? "deep" : "quick";
  const episodeId = await createPodcastEpisode({
    query: content,
    speakers: speakerIds.map(id => ({ speakerId: id })),
    language: "zh",
    mode: apiMode,
  });

  console.log(`[ListenHub] Created episode: ${episodeId}`);

  // 3. 等待完成
  const episode = await waitForPodcastCompletion(episodeId);

  return episode;
}

/**
 * 生成直接敘述音訊（直接讀出文字，不轉換成對話）
 * 用於開場和結尾，確保文字被直接讀出而不被轉換成對話格式
 * 
 * 策略：嘗試多種 prompt 格式，找到最有效的方法
 * 
 * @param text 要讀出的文字
 * @param speakerId 主要 speaker ID（會用於生成音訊）
 * @returns 完成的 Episode（包含音檔 URL）
 */
export async function generateDirectNarration(
  text: string,
  speakerId: string
): Promise<PodcastEpisode> {
  if (!API_KEY) {
    throw new Error("ListenHub API Key not configured");
  }

  console.log(`[ListenHub] Generating direct narration with speaker: ${speakerId}`);
  console.log(`[ListenHub] Narration text (first 100 chars): ${text.substring(0, 100)}...`);

  // 定義多種策略，按優先級排序
  // 優先嘗試使用 FlowSpeech 參數（如果 API 支持）
  const strategies = [
    // 策略 1-3: 嘗試使用 FlowSpeech 參數（如果 API 支持）
    {
      name: "策略1：單一 speaker + type=flowspeech",
      query: text,
      speakers: [{ speakerId }],
      type: "flowspeech" as const,
    },
    {
      name: "策略2：單一 speaker + format=flowspeech",
      query: text,
      speakers: [{ speakerId }],
      format: "flowspeech" as const,
    },
    {
      name: "策略3：單一 speaker + format=narration",
      query: text,
      speakers: [{ speakerId }],
      format: "narration" as const,
    },
    // 策略 4-10: 使用更激進的 prompt 工程
    {
      name: "策略4：單一 speaker + 旁白標記",
      query: `旁白：${text}`,
      speakers: [{ speakerId }],
    },
    {
      name: "策略5：兩個相同 speaker + 極明確指示（第一個說話，第二個沉默）",
      query: `【重要指令：這是單人旁白，不是對話】
【規則：只有第一個 speaker 說話，第二個 speaker 完全沉默，不要有任何對話】
【模式：旁白模式，直接讀出文字，不要轉換成對話格式】

${text}

【再次確認：這是旁白，不是對話，只有第一個 speaker 說話】`,
      speakers: [{ speakerId }, { speakerId }],
    },
    {
      name: "策略6：使用「我」的第一人稱格式",
      query: `我：${text}`,
      speakers: [{ speakerId }],
    },
    {
      name: "策略7：使用「敘述者：」格式",
      query: `敘述者：${text}`,
      speakers: [{ speakerId }],
    },
    {
      name: "策略8：引號包裝 + 極明確指令",
      query: `【旁白指令：直接讀出以下引號內的文字，不要添加任何對話元素，不要轉換成對話格式，不要讓兩個 speaker 互相對話，只讓第一個 speaker 讀出】

"${text}"

【確認：這是旁白，不是對話】`,
      speakers: [{ speakerId }, { speakerId }],
    },
    {
      name: "策略9：使用特殊標記 + 明確指令",
      query: `[NARRATION_ONLY_MODE]
[SPEAKER_1_ONLY]
[NO_DIALOGUE]

${text}

[/NARRATION_ONLY_MODE]
[確認：只有第一個 speaker 說話，第二個 speaker 完全沉默]`,
      speakers: [{ speakerId }, { speakerId }],
    },
    {
      name: "策略10：最詳細的指令",
      query: `【旁白模式：直接讀出以下文字】
【重要：不要轉換成對話格式】
【重要：不要添加任何對話元素】
【重要：不要讓兩個 speaker 互相對話】
【重要：只讓第一個 speaker 以旁白形式讀出以下文字】
【重要：第二個 speaker 完全沉默，不要說話】

${text}

【最終確認：這是旁白，不是對話，只有第一個 speaker 說話】`,
      speakers: [{ speakerId }, { speakerId }],
    },
  ];

  // 嘗試每種策略，直到成功
  let lastError: Error | null = null;
  
  for (const strategy of strategies) {
    try {
      console.log(`[ListenHub] Trying ${strategy.name}...`);
      
      // 構建請求，包含可能的 FlowSpeech 參數
      const request: CreatePodcastRequest = {
        query: strategy.query,
        speakers: strategy.speakers,
        language: "zh",
        mode: "quick", // 使用 quick 模式以加快速度
      };
      
      // 如果策略包含 type 或 format 參數，添加到請求中
      if ('type' in strategy && strategy.type) {
        request.type = strategy.type;
      }
      if ('format' in strategy && strategy.format) {
        request.format = strategy.format;
      }
      
      const episodeId = await createPodcastEpisode(request);

      console.log(`[ListenHub] ✅ ${strategy.name} - Created episode: ${episodeId}`);

      // 等待完成
      const episode = await waitForPodcastCompletion(episodeId);
      
      console.log(`[ListenHub] ✅ ${strategy.name} - Episode completed successfully`);
      return episode;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[ListenHub] ❌ ${strategy.name} failed: ${errorMsg}`);
      lastError = error instanceof Error ? error : new Error(String(error));
      // 繼續嘗試下一個策略
    }
  }

  // 如果所有策略都失敗，拋出最後一個錯誤
  throw new Error(
    `All narration strategies failed. Last error: ${lastError?.message || "Unknown error"}`
  );
}
