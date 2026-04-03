import type { UserItemInput } from '@srm/users-data-access';
import type { RoleItem } from '@srm/roles-data-access';

export function validateAndMapUsersRows(
  this: any,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: UserItemInput[];
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: UserItemInput[] = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['Логин', 'ФИО', 'Email', 'Телефон', 'Код роли', 'Пароль'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  const rolesByCode = new Map<string, RoleItem>(
    this.rolesStore.items().map((r: RoleItem) => [r.code.trim().toLowerCase(), r] as const),
  );
  const seenLogins = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const login = String(row['Логин'] ?? '').trim();
    const fullName = String(row['ФИО'] ?? '').trim();
    const email = String(row['Email'] ?? '').trim();
    const phone = String(row['Телефон'] ?? '').trim();
    const roleCode = String(row['Код роли'] ?? '').trim();
    const password = String(row['Пароль'] ?? '').trim();

    if (!login || login.length < 2) {
      errors.push(`Строка ${rowNo}: логин обязателен (минимум 2 символа).`);
      return;
    }
    const lk = login.toLowerCase();
    if (seenLogins.has(lk)) {
      errors.push(`Строка ${rowNo}: логин «${login}» повторяется в файле.`);
      return;
    }
    seenLogins.add(lk);
    if (this.usersStore.items().some((u: any) => u.login.trim().toLowerCase() === lk)) {
      errors.push(`Строка ${rowNo}: логин «${login}» уже есть в справочнике.`);
      return;
    }
    if (!fullName || fullName.length < 2) {
      errors.push(`Строка ${rowNo}: ФИО — минимум 2 символа.`);
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Строка ${rowNo}: проверьте формат email.`);
      return;
    }
    const role = rolesByCode.get(roleCode.toLowerCase());
    if (!role || !role.isActive) {
      errors.push(`Строка ${rowNo}: неизвестный или неактивный код роли «${roleCode}».`);
      return;
    }
    if (!password || password.length < 4) {
      errors.push(`Строка ${rowNo}: пароль обязателен, минимум 4 символа.`);
      return;
    }

    mapped.push({
      login,
      password,
      fullName,
      email,
      phone,
      roleId: role.id,
    });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}
