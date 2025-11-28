/**
 * 文章網址處理服務
 * 抓取網頁內容並轉換為 Podcast 所需的格式
 */

import { invokeLLM } from "./_core/llm";
import { processTextToPodcast } from "./textService";

/**
 * 從網頁 URL 抓取文章內容
 */
async function fetchArticleContent(url: string): Promise<{ title: string; content: string }> {
  console.log(`[ArticleService] Fetching article from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();

    // 使用 LLM 從 HTML 中提取文章內容和標題
    const extractResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一個專業的網頁內容提取專家。請從 HTML 中提取文章的標題和主要內容，移除廣告、導航欄、側邊欄等無關內容。請以 JSON 格式回傳，包含 title 和 content 兩個欄位。"
        },
        {
          role: "user",
          content: `請從以下 HTML 中提取文章的標題和主要內容，以 JSON 格式回傳 {"title": "標題", "content": "內容"}\uff1a\n\n${html.substring(0, 50000)}` // 限制長度避免超過 token 限制
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "article_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "文章標題" },
              content: { type: "string", description: "文章內容" },
            },
            required: ["title", "content"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = extractResponse.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== 'string') {
      throw new Error('Failed to extract article content');
    }

    const extracted = JSON.parse(messageContent);
    const articleTitle = extracted.title || '文章 Podcast';
    const articleContent = extracted.content || '';

    if (!articleContent || articleContent.length < 100) {
      throw new Error('Failed to extract article content');
    }

    console.log(`[ArticleService] Article extracted - Title: ${articleTitle}, Content: ${articleContent.length} characters`);
    return { title: articleTitle, content: articleContent };

  } catch (error) {
    console.error(`[ArticleService] Failed to fetch article:`, error);
    throw new Error(`無法抓取文章內容：${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 處理文章網址，生成摘要和 Podcast 腳本
 */
export async function processArticleToPodcast(articleUrl: string) {
  console.log(`[ArticleService] Processing article URL: ${articleUrl}`);

  // 抓取文章內容和標題
  const { title, content } = await fetchArticleContent(articleUrl);

  // 使用文字處理服務處理文章內容
  const result = await processTextToPodcast(content);

  // 使用從網頁提取的標題覆蓋 LLM 生成的標題
  result.title = title;

  console.log(`[ArticleService] Article processing completed`);

  return result;
}
