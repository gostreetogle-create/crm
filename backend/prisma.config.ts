import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "prisma/config";

/** Каталог `backend/` — как в `src/config.ts`, чтобы CLI находил `.env` при запуске из монорепо. */
const backendRoot = path.dirname(fileURLToPath(import.meta.url));
const nodeEnvForEnvFile = process.env.NODE_ENV ?? "development";
const envFileFromVar = process.env.ENV_FILE;
const candidate = envFileFromVar ? envFileFromVar : `.env.${nodeEnvForEnvFile}`;
const envPath = path.resolve(backendRoot, candidate);
const fallbackPath = path.resolve(backendRoot, ".env");
const resolvedEnvPath = fs.existsSync(envPath) ? envPath : fallbackPath;
dotenvConfig({ path: resolvedEnvPath, override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  seed: "tsx prisma/seed.ts",
});
