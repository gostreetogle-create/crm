import fs from "node:fs";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

const nodeEnvForEnvFile = process.env.NODE_ENV ?? "development";
const envFileFromVar = process.env.ENV_FILE;
const candidate = envFileFromVar ? envFileFromVar : `.env.${nodeEnvForEnvFile}`;

const envPath = path.resolve(process.cwd(), candidate);
const fallbackPath = path.resolve(process.cwd(), ".env");

const resolvedEnvPath = fs.existsSync(envPath) ? envPath : fallbackPath;
dotenvConfig({ path: resolvedEnvPath, override: true });

const EnvSchema = z.object({
  PORT: z.coerce.number().optional(),
  CORS_ORIGIN: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  /** Абсолютный или относительный путь к каталогу архивов БД (volume в Docker). */
  BACKUP_DIR: z.string().optional(),
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
    : path.resolve(process.cwd(), backupDirRaw)
  : path.resolve(process.cwd(), "backups");

export const config = {
  port: env.PORT ?? 3000,
  corsOrigin: env.CORS_ORIGIN ?? "*",
  jwtSecret,
  nodeEnv,
  backupDir: backupDirResolved,
} as const;

// SECURITY: не используем CORS "*" в production, иначе фронт/скрипты из других доменов
// могут получить доступ к API с учетом credentials.
if (nodeEnv === "production") {
  const origin = (env.CORS_ORIGIN ?? "").trim();
  if (!origin || origin === "*") {
    throw new Error(
      'CORS_ORIGIN must be set to an explicit origin in production (no "*").',
    );
  }
}
