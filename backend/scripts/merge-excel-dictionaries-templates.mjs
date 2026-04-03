/**
 * Перенос данных из заполненного файла (например excel-dictionaries-template_test.xlsx)
 * в актуальный шаблон (excel-dictionaries-template.xlsx) с теми же листами и заголовками.
 *
 * Сопоставление: по имени листа (как в UI: «Единицы», «Материалы», …) и по тексту заголовка
 * в первой строке. Порядок колонок берётся из целевого шаблона; лишние колонки в источнике
 * игнорируются, отсутствующие в источнике остаются пустыми.
 *
 * Usage:
 *   node scripts/merge-excel-dictionaries-templates.mjs <источник.xlsx> <шаблон.xlsx> [результат.xlsx]
 * Если результат не указан — перезаписывается файл шаблона.
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

function normalizeXlsxBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function sheetToAoA(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
}

function rowIsBlank(row) {
  if (!row || !row.length) return true;
  return row.every((c) => String(c ?? '').trim() === '');
}

function trimTrailingBlankRows(rows) {
  let end = rows.length;
  while (end > 1 && rowIsBlank(rows[end - 1])) end -= 1;
  return rows.slice(0, end);
}

function merge(sourcePath, templatePath, outputPath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Нет файла источника: ${sourcePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(templatePath)) {
    console.error(`Нет файла шаблона: ${templatePath}`);
    process.exit(1);
  }

  const srcWb = XLSX.readFile(sourcePath);
  const tplWb = XLSX.readFile(templatePath);

  const srcSheets = new Set(srcWb.SheetNames);

  for (const sheetName of tplWb.SheetNames) {
    if (!srcSheets.has(sheetName)) {
      console.warn(`[пропуск] В источнике нет листа «${sheetName}» — оставлен шаблон без изменений.`);
      continue;
    }

    const srcAoA = trimTrailingBlankRows(sheetToAoA(srcWb.Sheets[sheetName]));
    const tplAoA = sheetToAoA(tplWb.Sheets[sheetName]);

    if (tplAoA.length === 0) {
      console.warn(`[пропуск] Пустой шаблон на листе «${sheetName}».`);
      continue;
    }

    const tplHeaders = tplAoA[0].map((h) => String(h ?? '').trim());
    if (tplHeaders.every((h) => h === '')) {
      console.warn(`[пропуск] Нет заголовков в первой строке листа «${sheetName}».`);
      continue;
    }

    if (srcAoA.length === 0) {
      console.warn(`[пропуск] Пустой источник на листе «${sheetName}».`);
      continue;
    }

    const srcHeaders = srcAoA[0].map((h) => String(h ?? '').trim());

    /** @type {Map<number, number>} индекс колонки в источнике -> индекс в шаблоне */
    const srcToTpl = new Map();
    const unmatchedSrc = [];
    for (let j = 0; j < srcHeaders.length; j++) {
      const h = srcHeaders[j];
      if (!h) continue;
      const idx = tplHeaders.indexOf(h);
      if (idx >= 0) srcToTpl.set(j, idx);
      else unmatchedSrc.push(h);
    }

    const unmatchedTpl = tplHeaders.filter((h, i) => {
      if (!h) return false;
      return !srcHeaders.includes(h);
    });

    if (unmatchedSrc.length) {
      console.warn(
        `[лист «${sheetName}»] Колонки есть в источнике, но нет в шаблоне (пропущены): ${unmatchedSrc.join('; ')}`,
      );
    }
    if (unmatchedTpl.length) {
      console.warn(
        `[лист «${sheetName}»] Колонки есть в шаблоне, но нет в источнике (останутся пустыми): ${unmatchedTpl.join('; ')}`,
      );
    }

    const out = [tplHeaders];
    for (let r = 1; r < srcAoA.length; r++) {
      const srcRow = srcAoA[r] || [];
      const newRow = new Array(tplHeaders.length).fill('');
      for (const [srcJ, tplJ] of srcToTpl) {
        const v = srcRow[srcJ];
        newRow[tplJ] = v === undefined || v === null ? '' : v;
      }
      out.push(newRow);
    }

    const newWs = XLSX.utils.aoa_to_sheet(out);
    tplWb.Sheets[sheetName] = newWs;
    console.log(`[ok] «${sheetName}»: строк данных ${out.length - 1}, сопоставлено колонок ${srcToTpl.size}/${tplHeaders.filter(Boolean).length}.`);
  }

  const buf = XLSX.write(tplWb, { type: 'buffer', bookType: 'xlsx' });
  const normalized = normalizeXlsxBuffer(buf);
  fs.writeFileSync(outputPath, normalized);
  console.log(`\nГотово: ${path.resolve(outputPath)}`);
}

const [src, tpl, out] = process.argv.slice(2);
if (!src || !tpl) {
  console.error(
    'Использование: node scripts/merge-excel-dictionaries-templates.mjs <источник.xlsx> <шаблон.xlsx> [выход.xlsx]',
  );
  process.exit(1);
}

merge(src, tpl, out ?? tpl);
