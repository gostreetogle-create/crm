/**
 * Нормализация путей к превью товаров `/media/trade-goods/…` (как на бэкенде при загрузке).
 * Если в БД уже `*_thumb_320.webp` / `*_medium_640` / `*_original` — не дублируем суффикс.
 */

const MEDIA_PREFIX = '/media/trade-goods/';

export function ensureTradeGoodThumbBasename(basename: string): string {
  console.log('[ensureThumb] input:', basename);
  const name = basename;
  const lower = name.toLowerCase();
  if (
    lower.includes('_thumb_320') ||
    lower.includes('_medium_640') ||
    lower.includes('_original')
  ) {
    console.log('[ensureThumb] output (early full):', name);
    return name;
  }
  const lastDot = name.lastIndexOf('.');
  const stem = lastDot > 0 ? name.slice(0, lastDot) : name;
  const stemLower = stem.toLowerCase();
  if (
    stemLower.includes('_thumb_320') ||
    stemLower.includes('_medium_640') ||
    stemLower.includes('_original')
  ) {
    console.log('[ensureThumb] output (early stem):', name);
    return name;
  }
  const result = `${stem}_thumb_320.webp`;
  console.log('[ensureThumb] output:', result);
  return result;
}

export function normalizeTradeGoodRelativePhoto(raw: string): string {
  const q = raw.indexOf('?');
  const query = q >= 0 ? raw.slice(q) : '';
  const pathOnly = (q >= 0 ? raw.slice(0, q) : raw).trim();
  let name = pathOnly;
  if (name.startsWith(MEDIA_PREFIX)) {
    name = name.slice(MEDIA_PREFIX.length);
  } else if (name.startsWith('/')) {
    return raw;
  }
  if (!name || name.includes('/')) {
    return raw;
  }
  const resolved = ensureTradeGoodThumbBasename(name);
  return `${MEDIA_PREFIX}${resolved}${query}`;
}

/**
 * Полный URL для `<img src>`: абсолютные http(s)/data и неподдерживаемые пути — без изменений.
 * При `mediaBaseUrl` пустом — относительный путь от корня сайта.
 */
export function resolveTradeGoodLinePhotoUrl(raw: string, mediaBaseUrl = ''): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t) || t.startsWith('data:')) return t;
  const base = mediaBaseUrl.replace(/\/$/, '');

  const normalized =
    t.startsWith('/') && !t.startsWith(MEDIA_PREFIX) ? t : normalizeTradeGoodRelativePhoto(t);

  if (normalized.startsWith(MEDIA_PREFIX)) {
    return base ? `${base}${normalized}` : normalized;
  }
  return t.startsWith('/')
    ? base
      ? `${base}${t}`
      : t
    : base
      ? `${base}${MEDIA_PREFIX}${t}`
      : `${MEDIA_PREFIX}${t}`;
}
