/**
 * Генерирует отсутствующие WebP-превью `*_thumb_320.webp` из исходных файлов
 * в `TRADE_GOODS_PHOTOS_DIR` (та же логика sharp, что в trade-goods.routes.ts при загрузке).
 *
 * Пропускает уже сгенерированные варианты `*_thumb_320.webp`, `*_medium_640.webp`, `*_original.webp`
 * как «исходники», чтобы не строить превью из превью.
 *
 * Запуск из каталога backend: `npm run regen:thumbs`
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { config } from '../src/config.js';

/** Уже сгенерированные производные (как в upload). */
const VARIANT_OUTPUT = /_(thumb_320|medium_640|original)\.webp$/i;

const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function isSourceCandidate(name: string): boolean {
  if (VARIANT_OUTPUT.test(name)) return false;
  const ext = path.extname(name).toLowerCase();
  return SOURCE_EXT.has(ext);
}

function thumb320FileName(sourceFileName: string): string {
  const ext = path.extname(sourceFileName);
  const base = ext ? sourceFileName.slice(0, -ext.length) : sourceFileName;
  return `${base}_thumb_320.webp`;
}

async function thumbMissing(dir: string, thumbName: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, thumbName));
    return false;
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
  const dir = config.tradeGoodsPhotosDir;
  await fs.mkdir(dir, { recursive: true });

  const names = await fs.readdir(dir);
  let generated = 0;
  let skippedExistingThumb = 0;
  let skippedNotSource = 0;
  let errors = 0;

  for (const name of names) {
    if (!isSourceCandidate(name)) {
      skippedNotSource += 1;
      continue;
    }
    const abs = path.join(dir, name);
    const st = await fs.stat(abs);
    if (!st.isFile()) continue;

    const thumbName = thumb320FileName(name);
    if (!(await thumbMissing(dir, thumbName))) {
      skippedExistingThumb += 1;
      continue;
    }

    try {
      const buf = await fs.readFile(abs);
      await sharp(buf, { failOn: 'none', limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 320, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(dir, thumbName));
      generated += 1;
      process.stdout.write(`+ ${thumbName}\n`);
    } catch (e) {
      errors += 1;
      console.error(`! ${name}:`, e);
    }
  }

  console.log(
    JSON.stringify(
      {
        dir,
        generated,
        skippedExistingThumb,
        skippedNotSource,
        errors,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
