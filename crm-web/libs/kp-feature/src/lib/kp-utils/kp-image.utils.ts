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

/**
 * Для списков товаров используем облегчённый thumb, если URL похож на `stem_N.ext`.
 * Fallback: исходный URL без модификации.
 */
export function toTradeGoodThumb320Url(urlTrimmed: string): string {
  const u = normalizeKpImageSrcForDisplay(urlTrimmed);
  if (!u) return '';
  const [pathOnly, query = ''] = u.split('?', 2);
  if (!pathOnly) return u;
  const m = pathOnly.match(/^(.*\/[^/?#]+_[0-9]+)\.(?:jpe?g|png|webp|gif)$/i);
  if (!m) return u;
  const base = m[1];
  const q = query ? `?${query}` : '';
  return `${base}_thumb_320.webp${q}`;
}

