import type { ProductItemInput } from '@srm/products-data-access';
import { isUuidString, parseExcelBool } from './dictionaries-page-excel-parse-utils';
import { parseNumberOrNull } from './dictionaries-page-form-utils';

function sumLineTotalsFromDetails(
  detailIds: string[],
  detailById: Map<string, { lineTotalRub?: number | null }>,
): number {
  if (detailIds.length === 0) return 0;
  return detailIds.reduce((s, id) => s + (detailById.get(id)?.lineTotalRub ?? 0), 0);
}

/**
 * Колонки совпадают с единым Excel (backend `excel-dictionaries`, лист «Изделия»)
 * и с экспортом плитки «Изделия» на хабе.
 */
export function validateAndMapProductsRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  items: Array<{ existingId?: string; input: ProductItemInput }>;
  errors: string[];
} {
  const errors: string[] = [];
  const items: Array<{ existingId?: string; input: ProductItemInput }> = [];

  if (!rows.length) return { ok: false, items, errors: ['Пустой файл.'] };

  const firstKeys = Object.keys(rows[0] ?? {});
  if (!firstKeys.includes('Наименование изделия') || !firstKeys.includes('ID детали')) {
    return {
      ok: false,
      items,
      errors: ['Нужны колонки «Наименование изделия» и «ID детали».'],
    };
  }

  const detailById = new Map<string, { lineTotalRub?: number | null }>(
    this.productionDetailsStore.items().map((d: { id: string; lineTotalRub?: number | null }) => [
      d.id,
      d,
    ] as const),
  );
  const detailIds = new Set(this.productionDetailsStore.items().map((d: { id: string }) => d.id));
  const wtIds = new Set(this.productionWorkTypesStore.items().map((w: { id: string }) => w.id));
  const colorIds = new Set(this.colorsStore.items().map((c: { id: string }) => c.id));
  const productIds = new Set(this.productsStore.items().map((p: { id: string }) => p.id));

  type RowParsed = {
    rowNo: number;
    productId: string;
    productName: string;
    priceRub: number | null;
    costRub: number | null;
    notes: string;
    isActive: boolean;
    sortOrder: number;
    productionDetailId: string;
    workTypeId: string;
    colorId: string;
  };

  const parsedRows: RowParsed[] = [];

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const productName = String(row['Наименование изделия'] ?? '').trim();
    const productId = String(row['ID изделия'] ?? '').trim();
    const detailId = String(row['ID детали'] ?? '').trim();
    const wt = String(row['ID вида работ'] ?? '').trim();
    const col = String(row['ID цвета'] ?? '').trim();
    const sortRaw = parseNumberOrNull(row['Порядок']);
    const sortOrder = sortRaw != null && sortRaw >= 0 ? Math.floor(sortRaw) : 0;

    if (!productName) {
      errors.push(`Строка ${rowNo}: укажите «Наименование изделия».`);
      return;
    }
    if (!detailId) {
      errors.push(`Строка ${rowNo}: укажите «ID детали».`);
      return;
    }
    if (!isUuidString(detailId)) {
      errors.push(`Строка ${rowNo}: «ID детали» — неверный формат UUID.`);
      return;
    }
    if (!detailIds.has(detailId)) {
      errors.push(`Строка ${rowNo}: деталь с таким id не найдена в справочнике.`);
      return;
    }
    if (wt && !isUuidString(wt)) {
      errors.push(`Строка ${rowNo}: «ID вида работ» — неверный формат UUID.`);
      return;
    }
    if (wt && !wtIds.has(wt)) {
      errors.push(`Строка ${rowNo}: вид работ с таким id не найден.`);
      return;
    }
    if (col && !isUuidString(col)) {
      errors.push(`Строка ${rowNo}: «ID цвета» — неверный формат UUID.`);
      return;
    }
    if (col && !colorIds.has(col)) {
      errors.push(`Строка ${rowNo}: цвет с таким id не найден.`);
      return;
    }
    if (productId && !isUuidString(productId)) {
      errors.push(`Строка ${rowNo}: «ID изделия» — неверный формат UUID.`);
      return;
    }
    if (productId && !productIds.has(productId)) {
      errors.push(`Строка ${rowNo}: изделие с таким id не найдено — оставьте пустым для создания нового.`);
      return;
    }

    parsedRows.push({
      rowNo,
      productId,
      productName,
      priceRub: parseNumberOrNull(row['Цена ₽']),
      costRub: parseNumberOrNull(row['Себестоимость ₽']),
      notes: String(row['Заметки'] ?? '').trim(),
      isActive: parseExcelBool(row['Активен'], true),
      sortOrder,
      productionDetailId: detailId,
      workTypeId: wt,
      colorId: col,
    });
  });

  if (errors.length) return { ok: false, items, errors: errors.slice(0, 8) };

  const groups = new Map<string, RowParsed[]>();
  const order: string[] = [];

  for (const r of parsedRows) {
    const key = r.productId || `n:${r.productName.toLowerCase()}`;
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(r);
  }

  for (const key of order) {
    const groupRows = groups.get(key)!;
    groupRows.sort((a, b) => a.sortOrder - b.sortOrder);
    const first = groupRows[0];
    const lines = groupRows.map((r, i) => ({
      sortOrder: r.sortOrder ?? i,
      productionDetailId: r.productionDetailId,
      workTypeId: r.workTypeId || null,
      colorId: r.colorId || null,
    }));

    const lineDetailIds = lines.map((l) => l.productionDetailId);
    const defaultSum = sumLineTotalsFromDetails(lineDetailIds, detailById);
    const priceFinal = first.priceRub ?? defaultSum;
    const costFinal = first.costRub ?? defaultSum;

    const input: ProductItemInput = {
      name: first.productName,
      priceRub: priceFinal,
      costRub: costFinal,
      notes: first.notes || null,
      isActive: first.isActive,
      lines,
    };

    const existingId = first.productId && productIds.has(first.productId) ? first.productId : undefined;
    items.push(existingId ? { existingId, input } : { input });
  }

  return { ok: true, items, errors: [] };
}
