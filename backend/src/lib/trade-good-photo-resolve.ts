import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ""] as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Имя файла по артикулу товара: без путей и `..` (как в каталоге на диске).
 */
export function sanitizeTradeGoodArticleFileKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const base = path.basename(t.replace(/\\/g, "/"));
  if (!base || base === "." || base.includes("..")) {
    return null;
  }
  return base;
}

/** Базовое имя без расширения для шаблона `stem_1.jpg`. */
export function stemFromTradeGoodArticleCode(articleCode: string | null | undefined): string | null {
  const safe = sanitizeTradeGoodArticleFileKey(articleCode ?? undefined);
  if (!safe) return null;
  const hasExt = path.extname(safe).length > 0;
  return hasExt ? safe.slice(0, -path.extname(safe).length) : safe;
}

/** Публичный URL для `<img src>` (префикс `/media/trade-goods`). */
export function tradeGoodPhotoPublicPath(fileNameOnDisk: string): string {
  return `/media/trade-goods/${encodeURIComponent(fileNameOnDisk)}`;
}

type NumberedPhoto = { n: number; name: string };

function collectNumberedPhotos(rootDir: string, stem: string): NumberedPhoto[] {
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    return [];
  }
  const out: NumberedPhoto[] = [];
  const re = new RegExp(`^${escapeRegex(stem)}_([0-9]+)\\.(jpg|jpeg|png|webp|gif)$`, "i");
  for (const name of fs.readdirSync(rootDir)) {
    const m = name.match(re);
    if (m) {
      out.push({ n: parseInt(m[1]!, 10), name });
    }
  }
  out.sort((a, b) => a.n - b.n);
  return out;
}

/** Один файл `stem.ext` без суффикса `_N` (старый формат). */
function findLegacyBasename(rootDir: string, stem: string): string | null {
  const direct = path.join(rootDir, stem);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return path.basename(direct);
  }
  const hasExt = path.extname(stem).length > 0;
  const baseStem = hasExt ? stem.slice(0, -path.extname(stem).length) : stem;
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = path.join(rootDir, baseStem + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.basename(candidate);
    }
  }
  return null;
}

/**
 * Абсолютный путь к главному фото для карточки.
 * `photoPrimaryIndex` — номер слота `stem_N` (1-based); для legacy-файла без `_N` только слот 1.
 */
export function findTradeGoodPrimaryPhotoAbsPath(
  rootDir: string,
  articleCode: string | null | undefined,
  photoPrimaryIndex: number,
): string | null {
  const stem = stemFromTradeGoodArticleCode(articleCode);
  if (!stem) return null;
  const idx = Number.isFinite(photoPrimaryIndex) && photoPrimaryIndex >= 1 ? Math.floor(photoPrimaryIndex) : 1;

  const numbered = collectNumberedPhotos(rootDir, stem);
  if (numbered.length > 0) {
    const hit = numbered.find((x) => x.n === idx) ?? numbered[0];
    if (!hit) return null;
    const abs = path.join(rootDir, hit.name);
    return fs.existsSync(abs) ? abs : null;
  }

  if (idx !== 1) return null;
  const legacy = findLegacyBasename(rootDir, stem);
  if (!legacy) return null;
  return path.join(rootDir, legacy);
}

/** Список публичных URL всех снимков в порядке `_1`, `_2`, …; если нет — один legacy-URL. */
export function listTradeGoodPhotoPublicUrls(
  rootDir: string,
  articleCode: string | null | undefined,
): string[] {
  const stem = stemFromTradeGoodArticleCode(articleCode);
  if (!stem) return [];

  const numbered = collectNumberedPhotos(rootDir, stem);
  if (numbered.length > 0) {
    return numbered.map((x) => tradeGoodPhotoPublicPath(x.name));
  }

  const legacy = findLegacyBasename(rootDir, stem);
  return legacy ? [tradeGoodPhotoPublicPath(legacy)] : [];
}

export function resolveTradeGoodPhotoDisplayUrl(
  rootDir: string,
  articleCode: string | null | undefined,
  photoPrimaryIndex: number,
): string | null {
  const abs = findTradeGoodPrimaryPhotoAbsPath(rootDir, articleCode, photoPrimaryIndex);
  if (!abs) return null;
  return tradeGoodPhotoPublicPath(path.basename(abs));
}

/**
 * Удалить все файлы фото для артикула: `stem_N.ext` и legacy `stem.ext`.
 */
export function clearTradeGoodPhotoFiles(dir: string, articleCode: string | null | undefined): void {
  const stem = stemFromTradeGoodArticleCode(articleCode);
  if (!stem || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

  const names = fs.readdirSync(dir);
  const reNumbered = new RegExp(`^${escapeRegex(stem)}_[0-9]+\\.[^.]+$`, "i");
  const reLegacy = new RegExp(`^${escapeRegex(stem)}\\.[^.]+$`, "i");
  for (const name of names) {
    if (reNumbered.test(name) || reLegacy.test(name)) {
      try {
        fs.unlinkSync(path.join(dir, name));
      } catch {
        /* ignore */
      }
    }
  }
}

export async function clearTradeGoodPhotoFilesAsync(
  dir: string,
  articleCode: string | null | undefined,
): Promise<void> {
  const stem = stemFromTradeGoodArticleCode(articleCode);
  if (!stem || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

  const names = await fs.promises.readdir(dir);
  const reNumbered = new RegExp(`^${escapeRegex(stem)}_[0-9]+\\.[^.]+$`, "i");
  const reLegacy = new RegExp(`^${escapeRegex(stem)}\\.[^.]+$`, "i");
  await Promise.all(
    names.map(async (name) => {
      if (!(reNumbered.test(name) || reLegacy.test(name))) return;
      try {
        await fs.promises.unlink(path.join(dir, name));
      } catch {
        /* ignore */
      }
    }),
  );
}

export function extFromImageMime(mime: string | undefined): string | null {
  const m = (mime ?? "").toLowerCase();
  if (m === "image/jpeg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  if (m === "image/gif") return ".gif";
  return null;
}

/**
 * @deprecated Используйте `findTradeGoodPrimaryPhotoAbsPath` / `listTradeGoodPhotoPublicUrls`.
 * Файл в корне `TRADE_GOODS_PHOTOS_DIR`: `{артикул}.jpg` или имя с расширением в JSON артикула.
 */
export function findTradeGoodPhotoOnDisk(
  rootDir: string,
  articleCode: string | null | undefined,
): string | null {
  return findTradeGoodPrimaryPhotoAbsPath(rootDir, articleCode, 1);
}
