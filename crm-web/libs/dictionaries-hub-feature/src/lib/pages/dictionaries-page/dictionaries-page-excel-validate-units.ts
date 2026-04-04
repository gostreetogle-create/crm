export function validateAndMapUnitsRows(rows: ReadonlyArray<Record<string, unknown>>): {
  ok: boolean;
  rows: Array<{ name: string; code: string; notes?: string; isActive: boolean }>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: Array<{ name: string; code: string; notes?: string; isActive: boolean }> = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Название', 'Код', 'Комментарий'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const name = String(row['Название'] ?? '').trim();
    const code = String(row['Код'] ?? '').trim();
    const notes = String(row['Комментарий'] ?? '').trim();

    if (!name) {
      errors.push(`Строка ${rowNo}: Название обязательно.`);
      return;
    }
    if (!code || code.length < 2) {
      errors.push(`Строка ${rowNo}: Код должен быть строкой длиной >= 2.`);
      return;
    }

    mapped.push({ name, code, notes, isActive: true });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

