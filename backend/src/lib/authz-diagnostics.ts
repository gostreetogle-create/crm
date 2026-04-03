import type { PrismaClient } from '@prisma/client';
import { AUTHZ_PERMISSION_KEY_SET } from './authz-permission-keys.js';

const SETTING_KEY = 'authz_matrix';

/** Коды ролей, для которых на фронте заданы дефолты в `DEFAULT_ROLE_PERMISSIONS_BY_CODE`. */
export const CANONICAL_ROLE_CODES = new Set([
  'admin',
  'viewer',
  'editor',
  'director',
  'accountant',
]);

export type AuthzDiagnosticsReport = {
  ok: boolean;
  matrix: {
    present: boolean;
    roleIdsInMatrix: string[];
    unknownRoleIds: string[];
    invalidPermissionKeys: Array<{ roleId: string; key: string }>;
  };
  roles: {
    total: number;
    /** Код не совпадает с каноном дефолтов — права только из матрицы или пусто. */
    codesWithoutCanonicalDefaults: Array<{ id: string; code: string; name: string }>;
  };
  users: { total: number };
};

function isMatrixRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function collectAuthzDiagnostics(prisma: PrismaClient): Promise<AuthzDiagnosticsReport> {
  const [matrixRow, allRoles, userCount] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: SETTING_KEY } }),
    prisma.role.findMany({ select: { id: true, code: true, name: true } }),
    prisma.user.count(),
  ]);

  const roleIdSet = new Set(allRoles.map((r) => r.id));
  const valueJson = matrixRow?.valueJson;

  const roleIdsInMatrix: string[] = [];
  const unknownRoleIds: string[] = [];
  const invalidPermissionKeys: Array<{ roleId: string; key: string }> = [];

  if (isMatrixRecord(valueJson)) {
    for (const roleId of Object.keys(valueJson)) {
      roleIdsInMatrix.push(roleId);
      if (!roleIdSet.has(roleId)) {
        unknownRoleIds.push(roleId);
      }
      const arr = valueJson[roleId];
      if (!Array.isArray(arr)) {
        continue;
      }
      for (const k of arr) {
        if (typeof k !== 'string' || !AUTHZ_PERMISSION_KEY_SET.has(k)) {
          invalidPermissionKeys.push({ roleId, key: typeof k === 'string' ? k : String(k) });
        }
      }
    }
  }

  const codesWithoutCanonicalDefaults = allRoles
    .filter((r) => !CANONICAL_ROLE_CODES.has(r.code.trim().toLowerCase()))
    .map((r) => ({ id: r.id, code: r.code, name: r.name }));

  const ok = unknownRoleIds.length === 0 && invalidPermissionKeys.length === 0;

  return {
    ok,
    matrix: {
      present: isMatrixRecord(valueJson) && Object.keys(valueJson).length > 0,
      roleIdsInMatrix,
      unknownRoleIds,
      invalidPermissionKeys,
    },
    roles: {
      total: allRoles.length,
      codesWithoutCanonicalDefaults,
    },
    users: { total: userCount },
  };
}
