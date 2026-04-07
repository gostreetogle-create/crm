/**
 * Проверка целостности: роли в БД, ключи в сохранённой матрице `authz_matrix`.
 * Запуск из каталога backend: `npm run authz:check`
 * Код выхода: 0 — ok, 1 — есть ошибки (неизвестные roleId в матрице или неверные ключи).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";
import { prisma } from '../src/lib/prisma.js';
import { collectAuthzDiagnostics } from '../src/lib/authz-diagnostics.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeEnv = process.env.NODE_ENV ?? "development";
const envFromVar = process.env.ENV_FILE;
const envCandidate = envFromVar ? envFromVar : `.env.${nodeEnv}`;
const envPath = path.resolve(backendRoot, envCandidate);
const envFallback = path.resolve(backendRoot, ".env");

dotenvConfig({ path: envPath, quiet: true });
dotenvConfig({ path: envFallback, quiet: true });

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    const skipNoDb =
      process.env.AUTHZ_CHECK_SKIP_NO_DB === "1" || process.argv.includes("--skip-no-db");
    if (skipNoDb) {
      console.warn("[authz:check] SKIP: DATABASE_URL is not set (--skip-no-db).");
      return;
    }
    console.error("[authz:check] DATABASE_URL is not set. Configure backend/.env and retry.");
    process.exitCode = 1;
    return;
  }
  const report = await collectAuthzDiagnostics(prisma);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error('[authz:check] FAILED: unknown roles in matrix or invalid permission keys.');
    process.exitCode = 1;
  } else {
    console.log('[authz:check] OK.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
