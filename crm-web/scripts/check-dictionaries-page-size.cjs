/**
 * Бэклог #50: лимит размера монолита dictionaries-page.ts (предупреждение роста).
 * Запуск: node scripts/check-dictionaries-page-size.cjs
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(
  __dirname,
  '../libs/dictionaries-hub-feature/src/lib/pages/dictionaries-page/dictionaries-page.ts',
);
/** Мягкий потолок; при превышении — exit 1 (CI). Поднимать только осознанно при распиле. */
const MAX_LINES = 6200;

function main() {
  const text = fs.readFileSync(TARGET, 'utf8');
  const lines = text.split(/\r?\n/).length;
  console.log(`dictionaries-page.ts: ${lines} lines (max ${MAX_LINES})`);
  if (lines > MAX_LINES) {
    console.error(
      `FATAL: dictionaries-page.ts exceeds ${MAX_LINES} lines. Refactor or raise MAX_LINES with team agreement.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

main();
