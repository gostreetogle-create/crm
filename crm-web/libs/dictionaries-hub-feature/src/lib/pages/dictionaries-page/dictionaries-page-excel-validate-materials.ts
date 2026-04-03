import type { MaterialItemInput } from '@srm/materials-data-access';
import type { MaterialCharacteristicItem } from '@srm/material-characteristics-data-access';
import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapMaterialsRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: MaterialItemInput[];
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: MaterialItemInput[] = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const firstKeys = Object.keys(rows[0] ?? {});
  if (!firstKeys.includes('Название') || !firstKeys.includes('Цена ₽')) {
    return {
      ok: false,
      rows: mapped,
      errors: ['Нужны колонки «Название» и «Цена ₽».'],
    };
  }

  const mcByCode = new Map<string, MaterialCharacteristicItem>(
    this.materialCharacteristicsStore
      .items()
      .map((x: MaterialCharacteristicItem) => [(x.code ?? '').trim().toLowerCase(), x] as const),
  );
  const mcById = new Map<string, MaterialCharacteristicItem>(
    this.materialCharacteristicsStore.items().map((x: MaterialCharacteristicItem) => [x.id, x] as const),
  );

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const name = String(row['Название'] ?? '').trim();
    const code = String(row['Код'] ?? '').trim();
    const mcId = String(row['ID характеристики'] ?? '').trim();
    const mcCode = String(row['Код характеристики'] ?? '').trim();
    const geoId = String(row['ID геометрии'] ?? '').trim();
    const geometryName = String(row['Название геометрии'] ?? '').trim();
    const unitId = String(row['ID единицы'] ?? '').trim();
    const unitCode = String(row['Код ЕИ'] ?? '').trim();
    const priceRaw = parseNumberOrNull(row['Цена ₽']);
    const notes = String(row['Заметки'] ?? '').trim();
    const activeRaw = String(row['Активен'] ?? '').trim().toLowerCase();

    if (!name) {
      errors.push(`Строка ${rowNo}: укажите название позиции.`);
      return;
    }

    let ch: MaterialCharacteristicItem | undefined = mcId ? mcById.get(mcId) : undefined;
    if (!ch && mcCode) {
      ch = mcByCode.get(mcCode.toLowerCase()) ?? undefined;
    }
    if (!ch || !ch.isActive) {
      errors.push(
        `Строка ${rowNo}: укажите «ID характеристики» или «Код характеристики» активной записи справочника характеристик.`,
      );
      return;
    }

    let geo = geoId ? this.geometriesStore.items().find((g: any) => g.id === geoId && g.isActive) : undefined;
    if (!geo && geometryName) {
      geo = this.geometriesStore
        .items()
        .find((g: any) => g.isActive && g.name.trim().toLowerCase() === geometryName.toLowerCase());
    }
    if (!geo) {
      errors.push(
        `Строка ${rowNo}: укажите «ID геометрии» или «Название геометрии» (как у активной записи «Форма и габариты»).`,
      );
      return;
    }

    let unitRef: { id: string; label: string } | null = null;
    if (unitId) {
      const u = this.unitsStore.items().find((x: any) => x.id === unitId);
      unitRef = u ? { id: u.id, label: `${u.name} (${u.code})` } : null;
    } else if (unitCode) {
      unitRef = this.resolveMaterialUnitIdByCode(unitCode);
    }
    if (!unitRef) {
      errors.push(`Строка ${rowNo}: укажите «ID единицы» или «Код ЕИ» из справочника единиц.`);
      return;
    }

    const supplierOrgId = String(row['ID поставщика'] ?? '').trim();
    if (supplierOrgId) {
      const org = this.organizationsStore.items().find((o: any) => o.id === supplierOrgId);
      if (!org) {
        errors.push(`Строка ${rowNo}: «ID поставщика» — нет организации с таким id в справочнике.`);
        return;
      }
    }

    if (priceRaw === null || Math.round(priceRaw) < 1) {
      errors.push(`Строка ${rowNo}: «Цена ₽» — целое число не меньше 1.`);
      return;
    }

    let isActiveRow = true;
    if (activeRaw && ['нет', 'no', 'false', '0'].includes(activeRaw)) {
      isActiveRow = false;
    } else if (activeRaw && !['да', 'yes', 'true', '1', ''].includes(activeRaw)) {
      errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
      return;
    }

    mapped.push({
      name,
      code: code || undefined,
      materialCharacteristicId: ch.id,
      geometryId: geo.id,
      geometryName: geo.name,
      unitId: unitRef.id,
      unitName: unitRef.label,
      supplierOrganizationId: supplierOrgId || undefined,
      purchasePriceRub: Math.round(priceRaw),
      notes: notes || undefined,
      isActive: isActiveRow,
    });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

