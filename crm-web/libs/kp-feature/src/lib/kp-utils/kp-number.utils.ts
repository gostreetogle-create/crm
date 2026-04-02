/**
 * Чистые функции парсинга чисел из строк КП.
 * Поддерживает пробелы и десятичные запятые.
 */

export function parseKpNumber(raw: unknown): number {
  const n = Number(String(raw ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function parseKpPercent(raw: unknown, defaultValue = 22): number {
  const n = Number(String(raw ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : defaultValue;
}

