import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapCoatingsRows(rows: ReadonlyArray<Record<string, unknown>>): {
  ok: boolean;
  rows: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }> = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Тип покрытия', 'Спецификация', 'Толщина, мкм'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const coatingType = String(row['Тип покрытия'] ?? '').trim();
    const coatingSpec = String(row['Спецификация'] ?? '').trim();
    const thicknessMicron = parseNumberOrNull(row['Толщина, мкм']);

    if (!coatingType || !coatingSpec || thicknessMicron === null) {
      errors.push(`Строка ${rowNo}: заполните Тип покрытия/Спецификация/Толщина, мкм.`);
      return;
    }
    if (thicknessMicron < 0) {
      errors.push(`Строка ${rowNo}: Толщина, мкм должен быть >= 0.`);
      return;
    }

    mapped.push({ coatingType, coatingSpec, thicknessMicron });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}
