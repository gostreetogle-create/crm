import { RoleItem } from '@srm/roles-data-access';

/** Запасной порядок, если в старых данных нет поля (не должно встречаться после миграции типов). */
const SORT_FALLBACK = 99_999;

/** Следующий номер порядка: max(`sortOrder`) + 1 (для пустого списка — 1). */
export function nextRoleSortOrder(items: readonly RoleItem[]): number {
  const max = items.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0);
  return max + 1;
}

/**
 * Сортировка ролей для матрицы и списков: сначала `sortOrder` по возрастанию, затем имя.
 */
export function compareRolesBySortOrder(a: RoleItem, b: RoleItem): number {
  const ao = a.sortOrder ?? SORT_FALLBACK;
  const bo = b.sortOrder ?? SORT_FALLBACK;
  if (ao !== bo) {
    return ao - bo;
  }
  return a.name.localeCompare(b.name, 'ru');
}
