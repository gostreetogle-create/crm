import type { RoleItemInput } from '@srm/roles-data-access';
import { allocateUniqueRoleCode, slugifyRoleCodeFromName } from '@srm/dictionaries-utils';
import { parseNumberOrNull } from './dictionaries-page-form-utils';
import type { DictionariesPage } from './dictionaries-page';

export function validateAndMapRolesRows(
  this: DictionariesPage,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: RoleItemInput[];
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: RoleItemInput[] = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Код', 'Порядок', 'Название', 'Заметка', 'Активна'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  const codeRe = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  const reservedLower = new Set<string>(
    this.rolesStore.items().map((r: { code: string }) => r.code.trim().toLowerCase()),
  );

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    let code = String(row['Код'] ?? '').trim();
    const sortRaw = parseNumberOrNull(row['Порядок']);
    const name = String(row['Название'] ?? '').trim();
    const notes = String(row['Заметка'] ?? '').trim();
    const activeRaw = String(row['Активна'] ?? 'да').trim().toLowerCase();

    if (sortRaw === null || !Number.isInteger(sortRaw) || sortRaw < 1 || sortRaw > 999_999) {
      errors.push(`Строка ${rowNo}: «Порядок» — целое число от 1 до 999999.`);
      return;
    }

    if (!name || name.length < 2) {
      errors.push(`Строка ${rowNo}: Название — минимум 2 символа.`);
      return;
    }

    if (code) {
      if (!codeRe.test(code)) {
        errors.push(
          `Строка ${rowNo}: Код — латиница, с буквы, далее буквы/цифры/_ (мин. длина 2), либо оставьте ячейку пустой.`,
        );
        return;
      }
      if (code.length < 2) {
        errors.push(`Строка ${rowNo}: Код не короче 2 символов (или оставьте пустым — создастся из названия).`);
        return;
      }
      if (code.toLowerCase() === 'admin') {
        errors.push(`Строка ${rowNo}: код «admin» зарезервирован для суперадминистратора.`);
        return;
      }
    } else {
      code = allocateUniqueRoleCode(slugifyRoleCodeFromName(name), reservedLower);
    }

    let isActive = true;
    if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
      isActive = true;
    } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
      isActive = false;
    } else {
      errors.push(`Строка ${rowNo}: в «Активна» укажите да или нет.`);
      return;
    }

    const ck = code.toLowerCase();
    if (reservedLower.has(ck)) {
      errors.push(`Строка ${rowNo}: код «${code}» уже занят (в справочнике или повтор в файле выше).`);
      return;
    }
    reservedLower.add(ck);

    mapped.push({
      code,
      name,
      sortOrder: sortRaw,
      notes: notes || undefined,
      isActive,
      isSystem: false,
    });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

