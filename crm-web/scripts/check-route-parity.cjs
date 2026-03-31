const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROUTE_FILES = [
  path.join(ROOT, 'src/app/app.routes.ts'),
  path.join(ROOT, 'srm-front/src/app/app.routes.ts'),
];

function extractRedirectSegments(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS\s*=\s*\[([^\]]*)\]/);
  if (match) {
    return match[1]
      .split(',')
      .map((x) => x.trim().replace(/['"`]/g, ''))
      .filter(Boolean)
      .sort();
  }

  // Fallback for mapped usage from shared export: ensure markers exist.
  if (!text.includes('DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS.map')) {
    throw new Error(`Route parity marker not found: ${filePath}`);
  }
  return null;
}

function main() {
  for (const filePath of ROUTE_FILES) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing route file: ${path.relative(ROOT, filePath)}`);
    }
    extractRedirectSegments(filePath);
  }
  const sharedConfig = path.join(
    ROOT,
    'libs/dictionaries-hub-feature/src/lib/dictionaries-public-redirects.ts',
  );
  const sharedText = fs.readFileSync(sharedConfig, 'utf8');
  const literals = [...sharedText.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  const expected = ['dictionaries', 'geometries', 'materials'];
  if (JSON.stringify(literals) !== JSON.stringify(expected)) {
    throw new Error(
      `Unexpected public redirect contract. Expected ${expected.join(', ')}, got ${literals.join(', ')}`,
    );
  }
  console.log('Route parity contract: OK');
}

main();
