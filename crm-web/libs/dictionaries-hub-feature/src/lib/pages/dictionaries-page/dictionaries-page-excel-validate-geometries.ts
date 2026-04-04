import { tryParseCompactGeometryParams } from './dictionaries-page-excel-parse-utils';
import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapGeometriesRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: Array<{
    name: string;
    shapeKey: string;
    heightMm?: number;
    lengthMm?: number;
    widthMm?: number;
    diameterMm?: number;
    thicknessMm?: number;
    notes?: string;
    isActive: boolean;
  }>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: Array<{
    name: string;
    shapeKey: string;
    heightMm?: number;
    lengthMm?: number;
    widthMm?: number;
    diameterMm?: number;
    thicknessMm?: number;
    notes?: string;
    isActive: boolean;
  }> = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Название', 'Тип', 'Параметры'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  const allowedShapes = new Set(['rectangular', 'cylindrical', 'tube', 'plate', 'custom']);

  const extractNumber = (source: string, pattern: RegExp): number | null => {
    const match = pattern.exec(source);
    if (!match) return null;
    return parseNumberOrNull(match[1]);
  };

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const name = String(row['Название'] ?? '').trim();
    const shapeKey = String(row['Тип'] ?? '').trim().toLowerCase();
    const paramsRaw = String(row['Параметры'] ?? '').trim();

    if (!name || !paramsRaw) {
      errors.push(`Строка ${rowNo}: заполните Название и Параметры.`);
      return;
    }
    if (!allowedShapes.has(shapeKey)) {
      errors.push(`Строка ${rowNo}: Тип должен быть одним из: ${Array.from(allowedShapes).join(', ')}.`);
      return;
    }

    const params = paramsRaw;
    let heightMm = extractNumber(params, /В\s*([0-9.,-]+)/i);
    let lengthMm = extractNumber(params, /Дл\s*([0-9.,-]+)/i);
    let widthMm = extractNumber(params, /Ш\s*([0-9.,-]+)/i);
    let diameterMm = extractNumber(params, /Диам\s*([0-9.,-]+)/i);
    let thicknessMm = extractNumber(params, /Толщ\s*([0-9.,-]+)/i);

    const legacyAny =
      heightMm !== null ||
      lengthMm !== null ||
      widthMm !== null ||
      diameterMm !== null ||
      thicknessMm !== null;

    if (!legacyAny) {
      const c = tryParseCompactGeometryParams(params, shapeKey);
      if (c) {
        heightMm = c.heightMm;
        lengthMm = c.lengthMm;
        widthMm = c.widthMm;
        diameterMm = c.diameterMm;
        thicknessMm = c.thicknessMm;
      }
    }

    const extractedAny = [heightMm, lengthMm, widthMm, diameterMm, thicknessMm].some((v) => v !== null);
    if (!extractedAny) {
      errors.push(
        `Строка ${rowNo}: Параметры не распознаны (старый формат: «В/Дл/Ш/Диам/Толщ …» или компактно: 20×20×3×6000 мм, ⌀32×2×6000 мм и т.п.).`,
      );
      return;
    }

    const requireIf = (cond: boolean, msg: string): void => {
      if (!cond) errors.push(`Строка ${rowNo}: ${msg}`);
    };

    if (shapeKey === 'rectangular') {
      requireIf(heightMm !== null, 'для rectangular нужны значения В.');
      requireIf(lengthMm !== null, 'для rectangular нужны значения Дл.');
      requireIf(widthMm !== null, 'для rectangular нужны значения Ш.');
    } else if (shapeKey === 'cylindrical') {
      requireIf(diameterMm !== null, 'для cylindrical нужны значения Диам.');
      requireIf(lengthMm !== null, 'для cylindrical нужны значения Дл.');
    } else if (shapeKey === 'tube') {
      requireIf(diameterMm !== null, 'для tube нужны значения Диам.');
      requireIf(lengthMm !== null, 'для tube нужны значения Дл.');
      requireIf(thicknessMm !== null, 'для tube нужны значения Толщ.');
    } else if (shapeKey === 'plate') {
      requireIf(lengthMm !== null, 'для plate нужны значения Дл.');
      requireIf(widthMm !== null, 'для plate нужны значения Ш.');
      requireIf(thicknessMm !== null, 'для plate нужны значения Толщ.');
    }

    if (errors.length && errors[errors.length - 1].startsWith(`Строка ${rowNo}:`)) {
      // если в этой строке накопились ошибки — не добавляем запись
      const rowErrorsCount = errors.filter((e) => e.startsWith(`Строка ${rowNo}:`)).length;
      if (rowErrorsCount) return;
    }

    const nonNegative = (v: number | null): boolean => v === null || v >= 0;
    if (![heightMm, lengthMm, widthMm, diameterMm, thicknessMm].every(nonNegative)) {
      errors.push(`Строка ${rowNo}: параметры должны быть >= 0.`);
      return;
    }

    mapped.push({
      name,
      shapeKey,
      heightMm: heightMm ?? undefined,
      lengthMm: lengthMm ?? undefined,
      widthMm: widthMm ?? undefined,
      diameterMm: diameterMm ?? undefined,
      thicknessMm: thicknessMm ?? undefined,
      notes: '',
      isActive: true,
    });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

