/**
 * 模板變數替換服務
 * 用於替換文字模板中的動態變數
 */

/**
 * 替換模板變數
 * @param template 模板文字
 * @param variables 變數物件
 * @returns 替換後的文字
 */
export function replaceTemplateVariables(
  template: string,
  variables: {
    date?: string;
    topic?: string;
    duration?: string;
    title?: string;
  }
): string {
  let result = template;

  // 替換 {date} - 當前日期
  if (variables.date !== undefined) {
    result = result.replace(/\{date\}/g, variables.date);
  }

  // 替換 {topic} - 主題
  if (variables.topic !== undefined) {
    result = result.replace(/\{topic\}/g, variables.topic);
  }

  // 替換 {duration} - 預估時長
  if (variables.duration !== undefined) {
    result = result.replace(/\{duration\}/g, variables.duration);
  }

  // 替換 {title} - 標題
  if (variables.title !== undefined) {
    result = result.replace(/\{title\}/g, variables.title);
  }

  return result;
}

/**
 * 格式化日期為中文格式
 * @param date 日期物件（預設為今天）
 * @returns 格式化的日期字串，例如：2024年12月1日
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 格式化時長為中文格式
 * @param seconds 秒數
 * @returns 格式化的時長字串，例如：5分鐘、1小時30分鐘
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}小時`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}分鐘`);
  }

  if (secs > 0 && hours === 0 && minutes === 0) {
    parts.push(`${secs}秒`);
  }

  return parts.join("") || "0秒";
}

