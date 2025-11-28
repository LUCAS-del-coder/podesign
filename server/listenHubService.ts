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
 * 輪詢等待 Episode 完成
 * @param episodeId Episode ID
 * @param maxWaitTime 最長等待時間（毫秒），預設 10 分鐘
 * @returns 完成的 Episode
 */
export async function waitForPodcastCompletion(
  episodeId: string,
  maxWaitTime: number = 20 * 60 * 1000 // 20 minutes
): Promise<PodcastEpisode> {
  const startTime = Date.now();

  console.log(`[ListenHub] Waiting for episode ${episodeId} to complete...`);

  // 先等待 60 秒再開始查詢
  await new Promise((resolve) => setTimeout(resolve, 60000));

  while (Date.now() - startTime < maxWaitTime) {
    const episode = await getPodcastEpisode(episodeId);

    if (episode.processStatus === "success") {
      console.log(`[ListenHub] Episode ${episodeId} completed successfully`);
      return episode;
    }

    if (episode.processStatus === "failed") {
      throw new Error(
        `Episode generation failed with code: ${episode.failCode}`
      );
    }

    // 每 10 秒查詢一次
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  throw new Error("Episode generation timeout");
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
