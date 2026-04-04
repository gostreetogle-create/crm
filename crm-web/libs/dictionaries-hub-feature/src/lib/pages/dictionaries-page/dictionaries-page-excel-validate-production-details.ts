import type { ProductionDetailItemInput } from '@srm/production-details-data-access';
import { isUuidString, parseExcelBool } from './dictionaries-page-excel-parse-utils';
import { productionDetailsPayloadFromValues } from './dictionaries-page-payload-builders';
import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapProductionDetailsRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: ProductionDetailItemInput[];
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: ProductionDetailItemInput[] = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const firstKeys = Object.keys(rows[0] ?? {});
  if (!firstKeys.includes('Название')) {
    return { ok: false, rows: mapped, errors: ['Нужна колонка «Название».'] };
  }

  const matIds = new Set(this.materialsStore.items().map((m: any) => m.id));
  const wtIds = new Set(this.productionWorkTypesStore.items().map((w: any) => w.id));

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const name = String(row['Название'] ?? '').trim();
    const qtyRaw = parseNumberOrNull(row['Кол-во']);
    const qty = qtyRaw != null && qtyRaw > 0 ? qtyRaw : 1;
    const code = String(row['Код'] ?? '').trim();
    const notes = String(row['Заметки'] ?? '').trim();
    const isActive = parseExcelBool(row['Активен'], true);

    const srcMat = String(row['ID источник материала'] ?? '').trim();
    const srcWt = String(row['ID источник вида работ'] ?? '').trim();

    if (!name || name.length < 2) {
      errors.push(`Строка ${rowNo}: укажите «Название» (минимум 2 символа).`);
      return;
    }
    if (qtyRaw !== null && qtyRaw <= 0) {
      errors.push(`Строка ${rowNo}: «Кол-во» должно быть больше 0.`);
      return;
    }

    if (srcMat) {
      if (!isUuidString(srcMat)) {
        errors.push(`Строка ${rowNo}: «ID источник материала» — неверный формат UUID.`);
        return;
      }
      if (!matIds.has(srcMat)) {
        errors.push(`Строка ${rowNo}: материал с таким id не найден в справочнике.`);
        return;
      }
    }
    if (srcWt) {
      if (!isUuidString(srcWt)) {
        errors.push(`Строка ${rowNo}: «ID источник вида работ» — неверный формат UUID.`);
        return;
      }
      if (!wtIds.has(srcWt)) {
        errors.push(`Строка ${rowNo}: вид работ с таким id не найден в справочнике.`);
        return;
      }
    }

    const payload = productionDetailsPayloadFromValues({
      name,
      code,
      qty,
      notes,
      isActive,
      sourceMaterialId: srcMat,
      sourceWorkTypeId: srcWt,
      snapshotMaterialName: String(row['Материал название'] ?? ''),
      snapshotMaterialCode: String(row['Материал код'] ?? ''),
      snapshotUnitCode: String(row['ЕИ код'] ?? ''),
      snapshotUnitName: String(row['ЕИ название'] ?? ''),
      snapshotPurchasePriceRub: parseNumberOrNull(row['Цена закуп ₽']),
      snapshotDensityKgM3: parseNumberOrNull(row['Плотность кг/м³']),
      snapshotHeightMm: parseNumberOrNull(row['В мм']),
      snapshotLengthMm: parseNumberOrNull(row['Дл мм']),
      snapshotWidthMm: parseNumberOrNull(row['Ш мм']),
      snapshotDiameterMm: parseNumberOrNull(row['Диам мм']),
      snapshotThicknessMm: parseNumberOrNull(row['Толщ мм']),
      snapshotCharacteristicName: String(row['Характеристика'] ?? ''),
      snapshotWorkTypeName: String(row['Вид работ'] ?? ''),
      snapshotWorkShortLabel: String(row['Сокращение работ'] ?? ''),
      snapshotHourlyRateRub: parseNumberOrNull(row['Ставка ₽/ч']),
      workTimeHours: parseNumberOrNull(row['Часы работ']),
    });
    mapped.push(payload);
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

