import type { MaterialCharacteristicsImportDraftRow, ReferenceSnapshot } from '@srm/dictionaries-utils';
import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapMaterialCharacteristicsRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  drafts: MaterialCharacteristicsImportDraftRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const drafts: MaterialCharacteristicsImportDraftRow[] = [];

  if (!rows.length) return { ok: false, drafts, errors: ['Пустой файл.'] };

  const firstKeys = Object.keys(rows[0] ?? {});
  const legacyFormat = firstKeys.includes('Цвет') && !firstKeys.includes('ID цвета');
  const newFormat = firstKeys.includes('ID цвета');

  const snap: ReferenceSnapshot = {
    colors: this.colorsStore.items(),
    surfaceFinishes: this.surfaceFinishesStore.items(),
    coatings: this.coatingsStore.items(),
  };

  if (legacyFormat) {
    const requiredHeaders = [
      'Название',
      'Код',
      'Плотность',
      'Цвет',
      'Финиш',
      'Покрытие',
      'Заметки',
      'Активен',
    ];
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return {
        ok: false,
        drafts,
        errors: [`Нет колонок: ${missingHeaders.join(', ')}`],
      };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const code = String(row['Код'] ?? '').trim();
      const densityRaw = row['Плотность'];
      const colorRaw = String(row['Цвет'] ?? '').trim();
      const finishRaw = String(row['Финиш'] ?? '').trim();
      const coatingCell = String(row['Покрытие'] ?? '').trim();
      const notes = String(row['Заметки'] ?? '').trim();
      const activeRaw = String(row['Активен'] ?? '')
        .trim()
        .toLowerCase();

      if (!name || !colorRaw || !finishRaw || !coatingCell) {
        errors.push(`Строка ${rowNo}: заполните Название/Цвет/Финиш/Покрытие.`);
        return;
      }

      let densityKgM3: number | undefined;
      if (densityRaw !== '' && densityRaw !== null && densityRaw !== undefined) {
        const d = parseNumberOrNull(densityRaw);
        if (d === null || d < 0) {
          errors.push(`Строка ${rowNo}: Плотность должна быть числом >= 0 или пусто.`);
          return;
        }
        densityKgM3 = d;
      }

      let isActiveRow = true;
      if (!activeRaw) {
        isActiveRow = true;
      } else if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
        isActiveRow = true;
      } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
        isActiveRow = false;
      } else {
        errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
        return;
      }

      drafts.push({
        name,
        code: code || undefined,
        densityKgM3,
        colorRaw,
        finishRaw,
        coatingCell,
        notes: notes || undefined,
        isActive: isActiveRow,
      });
    });
  } else if (newFormat) {
    if (!firstKeys.includes('Название')) {
      return { ok: false, drafts, errors: ['Нужна колонка «Название».'] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      if (!name) {
        errors.push(`Строка ${rowNo}: укажите название.`);
        return;
      }
      const code = String(row['Код'] ?? '').trim();
      const densityRaw = row['Плотность кг/м³'];
      const notes = String(row['Заметки'] ?? '').trim();
      const activeRaw = String(row['Активен'] ?? '')
        .trim()
        .toLowerCase();

      let densityKgM3: number | undefined;
      if (densityRaw !== '' && densityRaw !== null && densityRaw !== undefined) {
        const d = parseNumberOrNull(densityRaw);
        if (d === null || d < 0) {
          errors.push(`Строка ${rowNo}: Плотность должна быть числом >= 0 или пусто.`);
          return;
        }
        densityKgM3 = d;
      }

      let isActiveRow = true;
      if (!activeRaw) {
        isActiveRow = true;
      } else if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
        isActiveRow = true;
      } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
        isActiveRow = false;
      } else {
        errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
        return;
      }

      const colorRaw = this.resolveMcImportColorRaw(row, snap, rowNo, errors);
      const finishRaw = this.resolveMcImportFinishRaw(row, snap, rowNo, errors);
      const coatingCell = this.resolveMcImportCoatingCell(row, snap, rowNo, errors);
      if (colorRaw === null || finishRaw === null || coatingCell === null) {
        return;
      }

      drafts.push({
        name,
        code: code || undefined,
        densityKgM3,
        colorRaw,
        finishRaw,
        coatingCell,
        notes: notes || undefined,
        isActive: isActiveRow,
      });
    });
  } else {
    return {
      ok: false,
      drafts,
      errors: [
        'Неизвестный формат файла: для старого шаблона нужны колонки «Цвет», «Финиш», «Покрытие»; для нового скачайте шаблон с хаба (колонки «ID цвета», …).',
      ],
    };
  }

  if (errors.length) return { ok: false, drafts, errors: errors.slice(0, 6) };
  return { ok: true, drafts, errors: [] };
}

