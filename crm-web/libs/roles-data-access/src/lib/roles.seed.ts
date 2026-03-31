import { RoleItem } from './role-item';

export const ROLE_ID_SYSTEM_ADMIN = 'role-sys-admin';
export const ROLE_ID_SYSTEM_EDITOR = 'role-sys-editor';
export const ROLE_ID_SYSTEM_VIEWER = 'role-sys-viewer';
export const ROLE_ID_SEED_DIRECTOR = 'role-seed-director';
export const ROLE_ID_SEED_ACCOUNTANT = 'role-seed-accountant';

/** Начальные роли; дальше — CRUD на хабе и права в «Админ-настройках». */
export const ROLES_SEED: readonly RoleItem[] = [
  {
    id: ROLE_ID_SYSTEM_ADMIN,
    code: 'admin',
    name: 'Администратор',
    sortOrder: 1,
    isActive: true,
    isSystem: true,
  },
  {
    id: ROLE_ID_SEED_DIRECTOR,
    code: 'director',
    name: 'Директор',
    sortOrder: 2,
    notes: 'Пример: задайте права в «Админ-настройках».',
    isActive: true,
    isSystem: false,
  },
  {
    id: ROLE_ID_SEED_ACCOUNTANT,
    code: 'accountant',
    name: 'Бухгалтер',
    sortOrder: 3,
    notes: 'Пример: задайте права в «Админ-настройках».',
    isActive: true,
    isSystem: false,
  },
  {
    id: ROLE_ID_SYSTEM_EDITOR,
    code: 'editor',
    name: 'Редактор',
    sortOrder: 4,
    notes: 'Пример: права задаются в «Админ-настройках» (как у любой роли).',
    isActive: true,
    isSystem: false,
  },
  {
    id: ROLE_ID_SYSTEM_VIEWER,
    code: 'viewer',
    name: 'Только просмотр',
    sortOrder: 5,
    notes: 'Пример: можно удалить или переименовать — не зашито в систему.',
    isActive: true,
    isSystem: false,
  },
];
