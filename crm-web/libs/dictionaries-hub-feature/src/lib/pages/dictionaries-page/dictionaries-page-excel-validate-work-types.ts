import type { ProductionWorkTypeItem } from '@srm/production-work-types-data-access';
import { parseExcelBool } from './dictionaries-page-excel-parse-utils';
import { normalizeWorkTypeName, parseNumberOrNull } from './dictionaries-page-form-utils';
import type { DictionariesPage } from './dictionaries-page';

export function validateAndMapWorkTypesRows(
  this: DictionariesPage,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: Array<{
    name: string;
    shortLabel: string;
    hourlyRateRub: number;
    isActive: boolean;
  }>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: Array<{
    name: string;
    shortLabel: string;
    hourlyRateRub: number;
    isActive: boolean;
  }> = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Наименование', 'Короткое обозначение', 'Ставка руб/ч', 'Активна'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  const seenInFile = new Set<string>();
  const existingNames = new Set(
    this.productionWorkTypesStore.items().map((x: ProductionWorkTypeItem) => normalizeWorkTypeName(x.name)),
  );

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const name = String(row['Наименование'] ?? '').trim();
    const shortLabel = String(row['Короткое обозначение'] ?? '').trim();
    const rateRaw = parseNumberOrNull(row['Ставка руб/ч']);
    const isActive = parseExcelBool(row['Активна'], true);
    const nameKey = normalizeWorkTypeName(name);

    if (!name || !shortLabel) {
      errors.push(`Строка ${rowNo}: заполните Наименование и Короткое обозначение.`);
      return;
    }
    if (rateRaw === null) {
      errors.push(`Строка ${rowNo}: укажите числовую «Ставка руб/ч».`);
      return;
    }
    const hourlyRateRub = Math.round(rateRaw);
    if (hourlyRateRub < 1) {
      errors.push(`Строка ${rowNo}: «Ставка руб/ч» — целое число не меньше 1.`);
      return;
    }
    if (name.length < 2) {
      errors.push(`Строка ${rowNo}: Наименование — минимум 2 символа.`);
      return;
    }
    if (seenInFile.has(nameKey)) {
      errors.push(`Строка ${rowNo}: наименование «${name}» повторяется в файле.`);
      return;
    }
    seenInFile.add(nameKey);
    if (existingNames.has(nameKey)) {
      errors.push(`Строка ${rowNo}: наименование «${name}» уже есть в справочнике.`);
      return;
    }
    existingNames.add(nameKey);

    mapped.push({ name, shortLabel, hourlyRateRub, isActive });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

