import type { ClientItemInput } from '@srm/clients-data-access';
import { parseNumberOrNull } from './dictionaries-page-form-utils';

export function validateAndMapClientsRows(rows: ReadonlyArray<Record<string, unknown>>): {
  ok: boolean;
  rows: ClientItemInput[];
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: ClientItemInput[] = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = [
    'Фамилия',
    'Имя',
    'Отчество',
    'Адрес',
    'Телефон',
    'Email',
    'Активен',
    'Заметки',
    'Паспорт серия',
    'Паспорт номер',
    'Кем выдан',
    'Дата выдачи',
  ];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const lastName = String(row['Фамилия'] ?? '').trim();
    const firstName = String(row['Имя'] ?? '').trim();
    const patronymic = String(row['Отчество'] ?? '').trim();
    const address = String(row['Адрес'] ?? '').trim();
    const phone = String(row['Телефон'] ?? '').trim();
    const email = String(row['Email'] ?? '').trim();
    const markupRaw = row['Наценка %'];
    const activeRaw = String(row['Активен'] ?? '')
      .trim()
      .toLowerCase();
    const notes = String(row['Заметки'] ?? '').trim();
    const passportSeries = String(row['Паспорт серия'] ?? '').trim();
    const passportNumber = String(row['Паспорт номер'] ?? '').trim();
    const passportIssuedBy = String(row['Кем выдан'] ?? '').trim();
    const passportIssuedDate = String(row['Дата выдачи'] ?? '').trim();

    if (!lastName) {
      errors.push(`Строка ${rowNo}: укажите фамилию.`);
      return;
    }
    if (!firstName) {
      errors.push(`Строка ${rowNo}: укажите имя.`);
      return;
    }

    let clientMarkupPercent: number | null = null;
    if (markupRaw !== '' && markupRaw !== null && markupRaw !== undefined) {
      const n = parseNumberOrNull(markupRaw);
      if (n === null) {
        errors.push(`Строка ${rowNo}: «Наценка %» должна быть числом или пусто.`);
        return;
      }
      if (n < 0 || n > 1000) {
        errors.push(`Строка ${rowNo}: наценка в диапазоне 0…1000 %.`);
        return;
      }
      clientMarkupPercent = Math.round(n);
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

    mapped.push({
      lastName,
      firstName,
      patronymic,
      address,
      phone,
      email,
      notes,
      clientMarkupPercent,
      passportSeries,
      passportNumber,
      passportIssuedBy,
      passportIssuedDate,
      isActive: isActiveRow,
    });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}
