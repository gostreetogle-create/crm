import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapSurfaceFinishesRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: Array<{ finishType: string; roughnessClass: string; raMicron?: number }>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: Array<{ finishType: string; roughnessClass: string; raMicron?: number }> = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Тип финиша', 'Шероховатость', 'Ra, мкм'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const finishType = String(row['Тип финиша'] ?? '').trim();
    const roughnessClass = String(row['Шероховатость'] ?? '').trim();
    const raMicron = parseNumberOrNull(row['Ra, мкм']);

    if (!finishType || !roughnessClass || raMicron === null) {
      errors.push(`Строка ${rowNo}: заполните Тип финиша/Шероховатость/Ra, мкм.`);
      return;
    }
    if (raMicron < 0) {
      errors.push(`Строка ${rowNo}: Ra, мкм должен быть >= 0.`);
      return;
    }

    mapped.push({ finishType, roughnessClass, raMicron });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}
