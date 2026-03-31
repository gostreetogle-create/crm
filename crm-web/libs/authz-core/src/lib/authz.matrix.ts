import { PERMISSION_KEYS_ORDERED } from './authz.catalog';
import { PermissionKey } from './authz.types';
import { DICTIONARY_HUB_PERMISSION_KEYS } from './dict-hub-permissions';

/**
 * Канон по умолчанию **только для кода `admin`** (суперадмин).
 * Любая другая роль (`editor`, произвольный код и т.д.) без строки здесь получает `[]` —
 * права задаются в «Админ-настройках» (или переопределение в localStorage).
 */
export const DEFAULT_ROLE_PERMISSIONS_BY_CODE: Record<string, readonly PermissionKey[]> = {
  admin: [...PERMISSION_KEYS_ORDERED],
  // Без переопределений матрицы (localStorage) системные роли должны хотя бы видеть хаб «Справочники».
  // CRUD/Excel оставляем выключенными, чтобы не выдавать лишнее автоматически.
  viewer: ['page.dictionaries', ...DICTIONARY_HUB_PERMISSION_KEYS],
  editor: ['page.dictionaries', ...DICTIONARY_HUB_PERMISSION_KEYS],
  director: ['page.dictionaries', ...DICTIONARY_HUB_PERMISSION_KEYS],
  accountant: ['page.dictionaries', ...DICTIONARY_HUB_PERMISSION_KEYS],
};

/** @deprecated Используйте `DEFAULT_ROLE_PERMISSIONS_BY_CODE`. */
export const ROLE_PERMISSIONS = {
  admin: DEFAULT_ROLE_PERMISSIONS_BY_CODE['admin'],
  editor: [] as readonly PermissionKey[],
  viewer: [] as readonly PermissionKey[],
} as const;
