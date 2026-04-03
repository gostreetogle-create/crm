import { PERMISSION_KEYS_ORDERED } from './authz.catalog';
import { PermissionKey } from './authz.types';
import { DICTIONARY_HUB_PERMISSION_KEYS } from './dict-hub-permissions';

/**
 * Типовой «рабочий» набор без раздела «Админ-настройки» (его оставляем только у суперадмина).
 * director / editor / accountant — полный доступ к приложению по умолчанию, пока матрица не переопределена.
 */
export const DEFAULT_PERMISSIONS_BUSINESS_WORKSPACE: readonly PermissionKey[] = PERMISSION_KEYS_ORDERED.filter(
  (k) => k !== 'page.admin.settings',
);

/**
 * Дефолтные права по **коду роли** (нижний регистр), пока для роли нет явного переопределения матрицы.
 * Код `admin` здесь не используется для суперадмина: у него полный набор через `isSuperAdminRole`.
 * `viewer` — только просмотр хаба (без CRUD/Excel и без лишних разделов).
 * Любой **другой** код (кастомная роль) без матрицы получает `[]`.
 */
export const DEFAULT_ROLE_PERMISSIONS_BY_CODE: Record<string, readonly PermissionKey[]> = {
  admin: [...PERMISSION_KEYS_ORDERED],
  viewer: ['page.dictionaries', ...DICTIONARY_HUB_PERMISSION_KEYS],
  editor: [...DEFAULT_PERMISSIONS_BUSINESS_WORKSPACE],
  director: [...DEFAULT_PERMISSIONS_BUSINESS_WORKSPACE],
  accountant: [...DEFAULT_PERMISSIONS_BUSINESS_WORKSPACE],
};

/** @deprecated Используйте `DEFAULT_ROLE_PERMISSIONS_BY_CODE`. */
export const ROLE_PERMISSIONS = {
  admin: DEFAULT_ROLE_PERMISSIONS_BY_CODE['admin'],
  editor: [] as readonly PermissionKey[],
  viewer: [] as readonly PermissionKey[],
} as const;
