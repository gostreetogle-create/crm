/**
 * Генерирует `canonical-roles.generated.ts` из единственного источника:
 * `backend/shared/canonical-roles.seed.json` (Prisma seed, Docker).
 *
 * Запуск: `npm run sync:canonical-roles` (из каталога crm-web).
 * В CI после изменения JSON должен быть пустой `git diff` на сгенерированный файл.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.resolve(ROOT, '../backend/shared/canonical-roles.seed.json');
const OUT = path.join(ROOT, 'libs/roles-data-access/src/lib/canonical-roles.generated.ts');

function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`FATAL: missing ${path.relative(process.cwd(), JSON_PATH)}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('FATAL: canonical-roles.seed.json must be a non-empty array');
    process.exit(1);
  }

  const banner = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: backend/shared/canonical-roles.seed.json
 * Regenerate: npm run sync:canonical-roles (from crm-web/)
 */

`;

  const serialized = JSON.stringify(rows, null, 2);
  const body = `export const CANONICAL_ROLES_SEED = ${serialized} as const;

export default CANONICAL_ROLES_SEED;
`;

  fs.writeFileSync(OUT, banner + body, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${rows.length} roles)`);
}

main();
