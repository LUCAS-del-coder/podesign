/**
 * 聲音名稱自訂對照表
 * 將 ListenHub API 返回的原始名稱轉換為繁體中文自訂名稱
 */
const VOICE_NAME_MAPPING: Record<string, string> = {
  // 原始名稱 → 自訂名稱
  '晓曼': '溫柔女聲',
  '原野': '磁性男聲',
  '高晴': '活潑女聲',
  '苏哲': '沉穩男聲',
  '直播雪姐': '直播女主播',
  '子墨': '知性男聲',
  '国栋': '渾厚男聲',
  '台湾女声': '台灣女聲',
  '约翰大叔': '約翰大叔',
  '山姆大叔': '山姆大叔',
  '苏晚': '清新女聲',
  '常四爷': '說書老爺',
  '古今先生': '古今先生',
  '冥想阿星': '冥想男聲',
  '诗涵': '詩涵女聲',
  '冥想阿岚': '冥想女聲',
  '直播浩哥': '直播男主播',
  '故事云舒': '故事姐姐',
  '故事精灵': '故事精靈',
  '故事童声': '故事童聲',
};

/**
 * 將原始聲音名稱轉換為繁體中文自訂名稱
 * 如果找不到對應的自訂名稱，則使用簡繁轉換
 */
export function convertVoiceNameToTraditional(name: string): string {
  // 優先使用自訂名稱
  if (VOICE_NAME_MAPPING[name]) {
    return VOICE_NAME_MAPPING[name];
  }
  
  // 如果沒有自訂名稱，進行簡繁轉換
  return convertSimplifiedToTraditional(name);
}

/**
 * 簡繁轉換（備用方案）
 */
function convertSimplifiedToTraditional(name: string): string {
  const simplifiedToTraditional: Record<string, string> = {
    '台湾': '台灣',
    '声': '聲',
    '国': '國',
    '说': '說',
    '书': '書',
    '话': '話',
    '诗': '詩',
    '约': '約',
    '叔': '叔',
    '爷': '爺',
    '岚': '嵐',
    '涵': '涵',
    '灵': '靈',
  };
  
  let result = name;
  for (const [simplified, traditional] of Object.entries(simplifiedToTraditional)) {
    result = result.replace(new RegExp(simplified, 'g'), traditional);
  }
  
  return result;
}
