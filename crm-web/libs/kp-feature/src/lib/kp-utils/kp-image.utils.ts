/**
 * Показ превью:
 * - только `http(s)://...` или абсолютный путь с `/...`
 * - иначе возвращаем пустую строку, чтобы не пытаться рендерить “не URL”.
 */
export function normalizeKpImageSrcForDisplay(urlTrimmed: string): string {
  if (!urlTrimmed) return '';
  if (urlTrimmed.startsWith('https://') || urlTrimmed.startsWith('http://') || urlTrimmed.startsWith('/')) {
    return urlTrimmed;
  }
  return '';
}

