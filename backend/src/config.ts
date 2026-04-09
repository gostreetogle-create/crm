import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

/** Корень пакета `backend` (не `process.cwd()`), чтобы `.env` находился при запуске из корня монорепо. */
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const nodeEnvForEnvFile = process.env.NODE_ENV ?? "development";
const envFileFromVar = process.env.ENV_FILE;
const candidate = envFileFromVar ? envFileFromVar : `.env.${nodeEnvForEnvFile}`;

const envPath = path.resolve(backendRoot, candidate);
const fallbackPath = path.resolve(backendRoot, ".env");

const resolvedEnvPath = fs.existsSync(envPath) ? envPath : fallbackPath;
dotenvConfig({ path: resolvedEnvPath, override: true });

const EnvSchema = z.object({
  PORT: z.coerce.number().optional(),
  JWT_SECRET: z.string().optional(),
  /** Максимальный размер JSON body (например: 2mb, 10mb, 25mb). */
  JSON_BODY_LIMIT: z.string().trim().optional(),
  /** Абсолютный или относительный путь к каталогу архивов БД (volume в Docker). */
  BACKUP_DIR: z.string().optional(),
  /**
   * Каталог с файлами «Фото для КП»: `KP_PHOTOS_DIR/{organizationId}/имя-файла.jpg`.
   * Раздаётся по префиксу `/media/kp-photos` (см. app.ts).
   */
  KP_PHOTOS_DIR: z.string().optional(),
  /**
   * Фото карточек товаров по артикулу: `TRADE_GOODS_PHOTOS_DIR/{артикул}.jpg`.
   * Раздаётся по префиксу `/media/trade-goods` (см. app.ts).
   */
  TRADE_GOODS_PHOTOS_DIR: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

const nodeEnv = process.env.NODE_ENV ?? nodeEnvForEnvFile;

const jwtSecret =
  env.JWT_SECRET?.trim() ||
  (nodeEnv === "production"
    ? ""
    : "dev-only-insecure-crm-jwt-secret-min-32chars");

if (jwtSecret.length < 16) {
  throw new Error(
    "JWT_SECRET must be at least 16 characters (set in .env or deploy/.env)",
  );
}

const backupDirRaw = env.BACKUP_DIR?.trim();
const backupDirResolved = backupDirRaw
  ? path.isAbsolute(backupDirRaw)
    ? backupDirRaw
    : path.resolve(backendRoot, backupDirRaw)
  : path.resolve(backendRoot, "backups");

const kpPhotosDirRaw = env.KP_PHOTOS_DIR?.trim();
const kpPhotosDirResolved = kpPhotosDirRaw
  ? path.isAbsolute(kpPhotosDirRaw)
    ? kpPhotosDirRaw
    : path.resolve(backendRoot, kpPhotosDirRaw)
  : path.resolve(backendRoot, "uploads", "kp-photos");

const tradeGoodsPhotosDirRaw = env.TRADE_GOODS_PHOTOS_DIR?.trim();
const tradeGoodsPhotosDirResolved = tradeGoodsPhotosDirRaw
  ? path.isAbsolute(tradeGoodsPhotosDirRaw)
    ? tradeGoodsPhotosDirRaw
    : path.resolve(backendRoot, tradeGoodsPhotosDirRaw)
  : path.resolve(backendRoot, "uploads", "trade-goods-photos");

export const config = {
  port: env.PORT ?? 3000,
  jwtSecret,
  nodeEnv,
  jsonBodyLimit: env.JSON_BODY_LIMIT && env.JSON_BODY_LIMIT.length > 0 ? env.JSON_BODY_LIMIT : "25mb",
  backupDir: backupDirResolved,
  /** Абсолютный путь к корню файлов КП (подпапки = organizationId). */
  kpPhotosDir: kpPhotosDirResolved,
  /** Плоский каталог: имя файла = артикул товара (`code`), напр. `TG-001.jpg`. */
  tradeGoodsPhotosDir: tradeGoodsPhotosDirResolved,
} as const;
