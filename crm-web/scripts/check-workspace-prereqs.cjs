const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'nx.json',
  'eslint.config.mjs',
  'jest.preset.js',
  'project.json',
  'srm-front/project.json',
  'libs/ui-kit/project.json',
  'libs/dictionaries-hub-feature/project.json',
];

/** Канон ролей для Prisma seed и для `npm run sync:canonical-roles`. */
const CANONICAL_ROLES_JSON = path.resolve(ROOT, '../backend/shared/canonical-roles.seed.json');

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function main() {
  const missing = REQUIRED_FILES.filter((p) => !exists(p));
  if (missing.length > 0) {
    console.error('FATAL: Nx workspace prerequisites are missing.');
    for (const p of missing) {
      console.error(`- ${p}`);
    }
    process.exit(1);
  }

  if (!fs.existsSync(CANONICAL_ROLES_JSON)) {
    console.error(
      `FATAL: canonical roles seed missing: ${path.relative(process.cwd(), CANONICAL_ROLES_JSON)}`,
    );
    process.exit(1);
  }

  console.log('Workspace prerequisites: OK');
}

main();
