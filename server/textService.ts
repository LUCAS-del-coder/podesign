/**
 * 文字處理服務
 * 將使用者輸入的文字轉換為 Podcast 所需的格式
 */

import { invokeLLM } from "./_core/llm";

/**
 * 處理文字輸入，生成摘要和 Podcast 腳本
 */
export async function processTextToPodcast(textContent: string) {
  console.log(`[TextService] Processing text content (${textContent.length} characters)...`);

  // 使用 LLM 生成標題
  const titleResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是一個專業的標題撰寫專家。請為內容生成一個簡潔、吸引人的標題，不超過 30 個字。"
      },
      {
        role: "user",
        content: `請為以下內容生成一個簡潔的標題（不超過 30 字）：\n\n${textContent.substring(0, 1000)}`
      }
    ]
  });

  const titleContent = titleResponse.choices[0]?.message?.content;
  const title = typeof titleContent === 'string' ? titleContent.trim() : '文字內容 Podcast';

  // 使用 LLM 生成摘要
  const summaryResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是一個專業的內容摘要專家。請將使用者提供的文字內容整理成清晰、結構化的摘要。"
      },
      {
        role: "user",
        content: `請為以下內容生成一個詳細的摘要，包含主要觀點和關鍵信息：\n\n${textContent}`
      }
    ]
  });

  const summaryContent = summaryResponse.choices[0]?.message?.content;
  const summary = typeof summaryContent === 'string' ? summaryContent : '';

  // 使用 LLM 生成 Podcast 腳本
  const scriptResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是一個專業的 Podcast 腳本作家。請將內容轉換成適合兩人對話的 Podcast 腳本格式。"
      },
      {
        role: "user",
        content: `請根據以下內容，創作一個生動有趣的雙人對話 Podcast 腳本。腳本應該：
1. 使用主持人 A 和主持人 B 的對話形式
2. 語氣自然、輕鬆
3. 包含開場白和結尾
4. 適當加入互動和討論

內容：
${textContent}

摘要：
${summary}`
      }
    ]
  });

  const scriptContent = scriptResponse.choices[0]?.message?.content;
  const podcastScript = typeof scriptContent === 'string' ? scriptContent : '';

  console.log(`[TextService] Text processing completed`);

  return {
    transcription: textContent, // 原始文字作為「轉錄」
    summary,
    podcastScript,
    audioUrl: null, // 文字輸入沒有原始音檔
    audioFileKey: null,
    title, // LLM 生成的標題
  };
}
