/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: backend/shared/canonical-roles.seed.json
 * Regenerate: npm run sync:canonical-roles (from crm-web/)
 */

export const CANONICAL_ROLES_SEED = [
  {
    "id": "role-sys-admin",
    "code": "admin",
    "name": "Администратор",
    "sortOrder": 1,
    "isSystem": true,
    "notes": "Единственная каноническая роль по умолчанию: полный доступ (матрица для суперадмина не применяется)."
  }
] as const;

export default CANONICAL_ROLES_SEED;
