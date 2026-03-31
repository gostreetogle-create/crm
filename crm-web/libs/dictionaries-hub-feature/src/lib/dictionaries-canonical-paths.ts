import { STANDALONE_DICTIONARY_CREATE } from './standalone-dictionary-create.meta';

/** Базовый путь хаба справочников (кириллица в URL). */
export const DICTIONARIES_HUB_BASE = '/справочники';

/**
 * Статические дочерние сегменты под `path: 'справочники'` (хаб, полноэкранный материал/характеристика).
 * Порядок совпадает с `app.routes.ts` до spread standalone-маршрутов.
 */
export const STATIC_DICTIONARIES_CHILD_SEGMENTS = ['', 'новый-материал', 'новая-характеристика-материала'] as const;

/**
 * Все дочерние сегменты `/справочники/...` (пустая строка = корень хаба).
 * Источник правды для контрактных тестов и доков рядом с `STANDALONE_DICTIONARY_CREATE`.
 */
export function canonicalDictionariesChildSegments(): readonly string[] {
  return [...STATIC_DICTIONARIES_CHILD_SEGMENTS, ...STANDALONE_DICTIONARY_CREATE.map((x) => x.path)];
}

/** Полные URL без query (для чеклистов / smoke). */
export function canonicalDictionariesUrls(): string[] {
  return canonicalDictionariesChildSegments().map((seg) =>
    seg === '' ? DICTIONARIES_HUB_BASE : `${DICTIONARIES_HUB_BASE}/${seg}`,
  );
}
