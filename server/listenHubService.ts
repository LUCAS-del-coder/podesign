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

  // 優化：減少初始等待時間（從 60 秒改為 30 秒）
  // 因為 ListenHub 通常在 30-60 秒內完成 quick 模式，deep 模式可能需要更長時間
  await new Promise((resolve) => setTimeout(resolve, 30000));

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
        
        // 等待一小段時間後再拋出錯誤，給 ListenHub 一些時間可能恢復
        // 但通常如果狀態已經是 failed，就不會再恢復了
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        throw new Error(errorMsg);
      }

      // 如果仍然是 pending，增加計數
      consecutivePendingCount++;
      
      // 動態調整輪詢間隔：
      // - 前 3 次：每 5 秒查詢（快速響應）
      // - 4-10 次：每 10 秒查詢（正常速度）
      // - 之後：每 15 秒查詢（節省 API 調用）
      if (consecutivePendingCount <= 3) {
        pollInterval = 5000; // 5 秒
      } else if (consecutivePendingCount <= 10) {
        pollInterval = 10000; // 10 秒
      } else {
        pollInterval = 15000; // 15 秒
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
