/**
 * Извлекает сырой текст из DOCX (word/document.xml), склеивая <w:t>.
 * Запуск: node scripts/docx-extract-text.cjs <path.docx>
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const docxPath = process.argv[2];
if (!docxPath) {
  console.error('Usage: node docx-extract-text.cjs <file.docx>');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-'));
try {
  execFileSync('tar', ['-xf', docxPath, '-C', tmp], { stdio: 'pipe' });
} catch (e) {
  console.error(e);
  process.exit(1);
}

const xmlPath = path.join(tmp, 'word', 'document.xml');
if (!fs.existsSync(xmlPath)) {
  console.error('No word/document.xml in', docxPath);
  process.exit(1);
}

const xml = fs.readFileSync(xmlPath, 'utf8');
const parts = [];
const re = /<w:t[^>]*xml:space="preserve"[^>]*>([\s\S]*?)<\/w:t>|<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
let m;
while ((m = re.exec(xml)) !== null) {
  const chunk = (m[1] !== undefined && m[1] !== '' ? m[1] : m[2]) || '';
  parts.push(chunk.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}
const text = parts.join('');
console.log(text);
fs.rmSync(tmp, { recursive: true, force: true });
