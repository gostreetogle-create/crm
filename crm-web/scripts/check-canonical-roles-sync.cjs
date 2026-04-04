/**
 * Регенерирует `canonical-roles.generated.ts` и падает, если рабочее дерево
 * отличается от коммита (нужно закоммитить результат `npm run sync:canonical-roles`).
 */
const { execSync } = require('child_process');
const path = require('path');

const CRM_WEB = path.resolve(__dirname, '..');
const REPO = path.resolve(CRM_WEB, '..');
const REL = 'crm-web/libs/roles-data-access/src/lib/canonical-roles.generated.ts';

function main() {
  execSync('node scripts/sync-canonical-roles.cjs', { cwd: CRM_WEB, stdio: 'inherit' });
  try {
    execSync(`git diff --exit-code -- ${REL}`, { cwd: REPO, stdio: 'inherit' });
  } catch {
    console.error(
      `\nFATAL: ${REL} не совпадает с backend/shared/canonical-roles.seed.json.\n` +
        `Запустите из crm-web: npm run sync:canonical-roles\n` +
        `и закоммитьте изменения.\n`,
    );
    process.exit(1);
  }
  console.log('Canonical roles generated file: in sync with backend JSON.');
}

main();
