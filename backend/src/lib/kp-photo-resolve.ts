import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ""] as const;

/**
 * Только имя файла, без каталогов и без `..`.
 */
export function sanitizeKpPhotoFileName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const base = path.basename(t.replace(/\\/g, "/"));
  if (!base || base === "." || base.includes("..")) {
    return null;
  }
  return base;
}

/**
 * Путь к существующему файлу на диске или null.
 */
export function findKpPhotoFileOnDisk(
  rootDir: string,
  organizationId: string,
  photoFileName: string | null | undefined,
): string | null {
  const safe = sanitizeKpPhotoFileName(photoFileName ?? undefined);
  if (!safe) return null;
  const orgId = String(organizationId ?? "").trim();
  if (!orgId || orgId.includes("..") || orgId.includes("/") || orgId.includes("\\")) {
    return null;
  }
  const orgDir = path.join(rootDir, orgId);
  if (!fs.existsSync(orgDir) || !fs.statSync(orgDir).isDirectory()) {
    return null;
  }

  const direct = path.join(orgDir, safe);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return direct;
  }

  const hasExt = path.extname(safe).length > 0;
  const stem = hasExt ? safe.slice(0, -path.extname(safe).length) : safe;
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = path.join(orgDir, stem + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Относительный URL для `<img src>` (префикс приложения `/media/kp-photos`).
 */
export function kpPhotoPublicPath(organizationId: string, fileNameOnDisk: string): string {
  const org = encodeURIComponent(organizationId);
  const file = encodeURIComponent(fileNameOnDisk);
  return `/media/kp-photos/${org}/${file}`;
}

/** URL для превью: файл на диске имеет приоритет над полем photoUrl (внешняя / data URL). */
export function resolveKpPhotoDisplayUrl(
  rootDir: string,
  organizationId: string,
  photoFileName: string | null | undefined,
  photoUrl: string | null | undefined,
): string | null {
  const abs = findKpPhotoFileOnDisk(rootDir, organizationId, photoFileName);
  if (abs) {
    const orgDir = path.join(rootDir, organizationId);
    const rel = path.relative(orgDir, abs).split(path.sep).join("/");
    return kpPhotoPublicPath(organizationId, rel);
  }
  const u = photoUrl?.trim();
  return u && u.length > 0 ? u : null;
}
