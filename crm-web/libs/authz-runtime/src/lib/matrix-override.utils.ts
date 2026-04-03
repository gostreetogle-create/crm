import { PERMISSION_KEYS_ORDERED, PermissionKey, RoleId } from '@srm/authz-core';

const VALID_PERMISSIONS = new Set<PermissionKey>(PERMISSION_KEYS_ORDERED);

/** Старые ключи матрицы в localStorage до перехода на id ролей. */
const LEGACY_ROLE_CODE_TO_ID: Readonly<Record<string, string>> = {
  admin: 'role-sys-admin',
  editor: 'role-sys-editor',
  viewer: 'role-sys-viewer',
};

export function normalizeMatrixRoleKey(key: string): string {
  return LEGACY_ROLE_CODE_TO_ID[key] ?? key;
}

/** Плитки хаба без `page.dictionaries` из матрицы убираем (согласованность хранилища и UI). */
export function stripDictHubKeysIfNoPageSection(keys: readonly PermissionKey[]): PermissionKey[] {
  if (keys.includes('page.dictionaries')) {
    return [...keys];
  }
  return keys.filter((k) => !k.startsWith('dict.hub.'));
}

export function parseMatrixOverride(raw: string | null): Partial<Record<RoleId, PermissionKey[]>> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const out: Partial<Record<RoleId, PermissionKey[]>> = {};
    for (const [key, arr] of Object.entries(parsed as Record<string, unknown>)) {
      const roleId = normalizeMatrixRoleKey(key);
      if (!Array.isArray(arr)) {
        continue;
      }
      const keys = stripDictHubKeysIfNoPageSection(
        arr.filter((x): x is PermissionKey => VALID_PERMISSIONS.has(x as PermissionKey)),
      );
      out[roleId as RoleId] = keys;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}
