import { PERMISSION_KEYS_ORDERED } from './authz.catalog';
import { PermissionKey } from './authz.types';

/**
 * Канон по умолчанию **только для кода `admin`** (суперадмин).
 * Любая другая роль (`editor`, произвольный код и т.д.) без строки здесь получает `[]` —
 * права задаются в «Админ-настройках» (или переопределение в localStorage).
 */
export const DEFAULT_ROLE_PERMISSIONS_BY_CODE: Record<string, readonly PermissionKey[]> = {
  admin: [...PERMISSION_KEYS_ORDERED],
};

/** @deprecated Используйте `DEFAULT_ROLE_PERMISSIONS_BY_CODE`. */
export const ROLE_PERMISSIONS = {
  admin: DEFAULT_ROLE_PERMISSIONS_BY_CODE['admin'],
  editor: [] as readonly PermissionKey[],
  viewer: [] as readonly PermissionKey[],
} as const;
