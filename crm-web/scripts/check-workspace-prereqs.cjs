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

  console.log('Workspace prerequisites: OK');
}

main();
