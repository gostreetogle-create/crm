import type { RoleItem } from './role-item';
/** Сгенерировано из `backend/shared/canonical-roles.seed.json` — см. `npm run sync:canonical-roles`. */
import canonicalRoles from './canonical-roles.generated';

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
/**
 * Канон одна роль — администратор. Старые константы оставлены для совместимости импортов;
 * все указывают на тот же id (`role-sys-admin`).
 */
export const ROLE_ID_SYSTEM_EDITOR = ROLE_ID_SYSTEM_ADMIN;
export const ROLE_ID_SYSTEM_VIEWER = ROLE_ID_SYSTEM_ADMIN;
export const ROLE_ID_SEED_DIRECTOR = ROLE_ID_SYSTEM_ADMIN;
export const ROLE_ID_SEED_ACCOUNTANT = ROLE_ID_SYSTEM_ADMIN;

/** Начальные роли для UI (тот же JSON, что Prisma seed). */
export const ROLES_SEED: readonly RoleItem[] = rows.map((r) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  sortOrder: r.sortOrder,
  notes: r.notes ?? undefined,
  isActive: true,
  isSystem: r.isSystem,
}));
