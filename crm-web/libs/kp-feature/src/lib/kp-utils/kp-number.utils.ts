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

/** Строка количества после сложения (без лишних дробных нулей). */
export function formatKpQtyString(n: number): string {
  if (!Number.isFinite(n)) {
    return '1';
  }
  const rounded = Math.round(n * 1e6) / 1e6;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(6).replace(/\.?0+$/, '');
}

