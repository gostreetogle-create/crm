/**
 * Канонические роли для `prisma db seed` — из одного JSON с фронтом:
 * `backend/shared/canonical-roles.seed.json`
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type SeedRoleRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  notes: string | null;
};

const jsonPath = join(__dirname, '../shared/canonical-roles.seed.json');

function loadCanonicalRoles(): readonly SeedRoleRow[] {
  const raw = readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Invalid canonical-roles.seed.json at ${jsonPath}`);
  }
  return parsed as SeedRoleRow[];
}

export const SEED_CANONICAL_ROLES: readonly SeedRoleRow[] = loadCanonicalRoles();
