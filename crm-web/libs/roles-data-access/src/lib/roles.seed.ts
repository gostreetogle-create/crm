import type { RoleItem } from './role-item';
import canonicalRoles from '@srm/canonical-roles';

type CanonicalRoleRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  notes: string | null;
};

const rows = canonicalRoles as readonly CanonicalRoleRow[];

function idFor(code: string): string {
  const r = rows.find((x) => x.code === code);
  if (!r) {
    throw new Error(`canonical-roles.seed.json: missing role code "${code}"`);
  }
  return r.id;
}

export const ROLE_ID_SYSTEM_ADMIN = idFor('admin');
export const ROLE_ID_SYSTEM_EDITOR = idFor('editor');
export const ROLE_ID_SYSTEM_VIEWER = idFor('viewer');
export const ROLE_ID_SEED_DIRECTOR = idFor('director');
export const ROLE_ID_SEED_ACCOUNTANT = idFor('accountant');

/** Начальные роли для UI; источник данных — `backend/shared/canonical-roles.seed.json`. */
export const ROLES_SEED: readonly RoleItem[] = rows.map((r) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  sortOrder: r.sortOrder,
  notes: r.notes ?? undefined,
  isActive: true,
  isSystem: r.isSystem,
}));
