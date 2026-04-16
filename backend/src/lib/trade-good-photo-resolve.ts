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

function appendVersion(url: string, absPath: string): string {
  try {
    const st = fs.statSync(absPath);
    const v = Math.floor(st.mtimeMs);
    return `${url}?v=${v}`;
  } catch {
    return url;
  }
}

type NumberedPhoto = { n: number; name: string };
type TradeGoodPhotoVariant = "thumb_320" | "medium_640" | "original";

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
    return numbered.map((x) => {
      const abs = path.join(rootDir, x.name);
      return appendVersion(tradeGoodPhotoPublicPath(x.name), abs);
    });
  }

  const legacy = findLegacyBasename(rootDir, stem);
  if (!legacy) return [];
  const abs = path.join(rootDir, legacy);
  return [appendVersion(tradeGoodPhotoPublicPath(legacy), abs)];
}

function variantNameForOriginalName(originalName: string, variant: TradeGoodPhotoVariant): string {
  const ext = path.extname(originalName);
  const base = ext ? originalName.slice(0, -ext.length) : originalName;
  return `${base}_${variant}.webp`;
}

function resolveVariantPublicUrl(
  rootDir: string,
  originalName: string,
  variant: TradeGoodPhotoVariant,
): string | null {
  const variantName = variantNameForOriginalName(originalName, variant);
  const variantAbs = path.join(rootDir, variantName);
  if (!fs.existsSync(variantAbs) || !fs.statSync(variantAbs).isFile()) return null;
  return appendVersion(tradeGoodPhotoPublicPath(variantName), variantAbs);
}

export function listTradeGoodPhotoVariantPublicUrls(
  rootDir: string,
  articleCode: string | null | undefined,
  variant: TradeGoodPhotoVariant,
): string[] {
  const stem = stemFromTradeGoodArticleCode(articleCode);
  if (!stem) return [];
  const numbered = collectNumberedPhotos(rootDir, stem);
  if (numbered.length === 0) return listTradeGoodPhotoPublicUrls(rootDir, articleCode);
  return numbered.map((x) => {
    const fallbackAbs = path.join(rootDir, x.name);
    const fallbackUrl = appendVersion(tradeGoodPhotoPublicPath(x.name), fallbackAbs);
    return resolveVariantPublicUrl(rootDir, x.name, variant) ?? fallbackUrl;
  });
}

export function resolveTradeGoodPhotoDisplayUrlVariant(
  rootDir: string,
  articleCode: string | null | undefined,
  photoPrimaryIndex: number,
  variant: TradeGoodPhotoVariant,
): string | null {
  const abs = findTradeGoodPrimaryPhotoAbsPath(rootDir, articleCode, photoPrimaryIndex);
  if (!abs) return null;
  const originalName = path.basename(abs);
  const fallbackUrl = appendVersion(tradeGoodPhotoPublicPath(originalName), abs);
  return resolveVariantPublicUrl(rootDir, originalName, variant) ?? fallbackUrl;
}

export function resolveTradeGoodPhotoDisplayUrl(
  rootDir: string,
  articleCode: string | null | undefined,
  photoPrimaryIndex: number,
): string | null {
  const abs = findTradeGoodPrimaryPhotoAbsPath(rootDir, articleCode, photoPrimaryIndex);
  if (!abs) return null;
  return appendVersion(tradeGoodPhotoPublicPath(path.basename(abs)), abs);
}

/**
 * Удалить все файлы фото для артикула: `stem_N.ext` и legacy `stem.ext`.
 */
export function clearTradeGoodPhotoFiles(dir: string, articleCode: string | null | undefined): void {
  const stem = stemFromTradeGoodArticleCode(articleCode);
  if (!stem || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

  const names = fs.readdirSync(dir);
  const reNumbered = new RegExp(`^${escapeRegex(stem)}_[0-9]+(?:_[a-z0-9_]+)?\\.[^.]+$`, "i");
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
  const reNumbered = new RegExp(`^${escapeRegex(stem)}_[0-9]+(?:_[a-z0-9_]+)?\\.[^.]+$`, "i");
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

/**
 * Переименовать все файлы фото при смене артикула (`oldStem_*` -> `newStem_*`).
 * Используем атомарный rename в пределах одного каталога.
 */
export async function moveTradeGoodPhotoFilesAsync(
  dir: string,
  fromArticleCode: string | null | undefined,
  toArticleCode: string | null | undefined,
): Promise<void> {
  const fromStem = stemFromTradeGoodArticleCode(fromArticleCode);
  const toStem = stemFromTradeGoodArticleCode(toArticleCode);
  if (!fromStem || !toStem || fromStem === toStem) return;
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
  const names = await fs.promises.readdir(dir);
  const re = new RegExp(`^${escapeRegex(fromStem)}((?:_[0-9]+(?:_[a-z0-9_]+)?)?\\.[^.]+)$`, "i");
  for (const name of names) {
    const m = name.match(re);
    if (!m) continue;
    const nextName = `${toStem}${m[1]}`;
    const fromAbs = path.join(dir, name);
    const toAbs = path.join(dir, nextName);
    try {
      await fs.promises.rename(fromAbs, toAbs);
    } catch {
      // Если rename не удался, оставляем исходный файл как есть.
    }
  }
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
