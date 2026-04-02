import type { KpLineItem } from '../kp-document-template/kp-document-template.component';
import { parseKpNumber } from './kp-number.utils';
import { parseKpPercent } from './kp-number.utils';

/**
 * Сумма строки КП без НДС: qty * price.
 */
export function calcKpLineSum(line: Pick<KpLineItem, 'qty' | 'price'>): number {
  const q = parseKpNumber(line.qty);
  const pr = parseKpNumber(line.price);
  return q * pr;
}

/**
 * Итого по таблице — сумма без НДС.
 */
export function calcKpTotalFromLines(lines: readonly KpLineItem[]): number {
  return lines.reduce((acc, line) => acc + calcKpLineSum(line), 0);
}

/**
 * Вычисление НДС сверху по ставке процента.
 */
export function calcKpVatAmountFromTotalWithoutRounding(totalWithoutVat: number, vatPercentRaw: unknown): number {
  const p = parseKpPercent(vatPercentRaw, 22);
  return totalWithoutVat * (p / 100);
}

/**
 * НДС из поля (строка ввода). Пусто => 0.
 */
export function parseKpVatAmount(raw: unknown): number {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  return parseKpNumber(s);
}

/**
 * Всего к оплате = итог по таблице + НДС.
 * Если у родителя задано `totalRub` — используем его как “истинный итог”.
 */
export function calcKpComputedTotal(totalRub: number | null, lines: readonly KpLineItem[]): number {
  if (totalRub != null && Number.isFinite(totalRub)) {
    return totalRub;
  }
  return calcKpTotalFromLines(lines);
}

/**
 * Итоговая сумма к оплате.
 */
export function calcKpTotalPayable(totalRub: number, vatRub: number): number {
  return totalRub + vatRub;
}

