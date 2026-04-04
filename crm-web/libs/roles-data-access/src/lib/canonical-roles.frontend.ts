/**
 * Копия данных из `backend/shared/canonical-roles.seed.json` для фронта и Jest.
 * При изменении ролей на бэкенде обновите этот файл вручную (или скопируйте JSON).
 */
export const CANONICAL_ROLE_ROWS = [
  {
    id: 'role-sys-admin',
    code: 'admin',
    name: 'Администратор',
    sortOrder: 1,
    isSystem: true,
    notes: null as string | null,
  },
  {
    id: 'role-seed-director',
    code: 'director',
    name: 'Директор',
    sortOrder: 2,
    isSystem: false,
    notes: 'Пример: задайте права в «Админ-настройках».',
  },
  {
    id: 'role-seed-accountant',
    code: 'accountant',
    name: 'Бухгалтер',
    sortOrder: 3,
    isSystem: false,
    notes: 'Пример: задайте права в «Админ-настройках».',
  },
  {
    id: 'role-sys-editor',
    code: 'editor',
    name: 'Редактор',
    sortOrder: 4,
    isSystem: false,
    notes: 'Пример: права задаются в «Админ-настройках» (как у любой роли).',
  },
  {
    id: 'role-sys-viewer',
    code: 'viewer',
    name: 'Только просмотр',
    sortOrder: 5,
    isSystem: false,
    notes: 'Пример: можно удалить или переименовать — не зашито в систему.',
  },
] as const;
