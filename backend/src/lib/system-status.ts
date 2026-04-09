import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma.js";
import { config } from "../config.js";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export type SystemNotice = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  commands: string[];
  aiPrompt: string;
};

export type SystemStatusPayload = {
  db: { ok: boolean; latencyMs?: number; error?: string };
  dbConnection: {
    databaseUrlPresent: boolean;
    protocol: string | null;
    host: string | null;
    port: number | null;
    database: string | null;
    dockerExpectedHostPort: number;
    dockerExpectedContainerPort: number;
  };
  migrations: {
    expectedCount: number;
    appliedCount: number | null;
    pendingNames: string[];
    extraInDbNames: string[];
  };
  notices: SystemNotice[];
  environment: { nodeEnv: string };
};

function parseDbConnectionInfo() {
  const raw = String(process.env.DATABASE_URL ?? "").trim();
  if (!raw) {
    return {
      databaseUrlPresent: false,
      protocol: null,
      host: null,
      port: null,
      database: null,
      dockerExpectedHostPort: 5432,
      dockerExpectedContainerPort: 5432,
    } as const;
  }
  try {
    const u = new URL(raw);
    const dbName = u.pathname.replace(/^\//, "").trim() || null;
    return {
      databaseUrlPresent: true,
      protocol: (u.protocol || "").replace(/:$/, "") || null,
      host: u.hostname || null,
      port: u.port ? Number(u.port) : 5432,
      database: dbName,
      dockerExpectedHostPort: 5432,
      dockerExpectedContainerPort: 5432,
    } as const;
  } catch {
    return {
      databaseUrlPresent: true,
      protocol: null,
      host: null,
      port: null,
      database: null,
      dockerExpectedHostPort: 5432,
      dockerExpectedContainerPort: 5432,
    } as const;
  }
}

function listExpectedMigrationFolders(): string[] {
  const migDir = path.join(backendRoot, "prisma", "migrations");
  if (!fs.existsSync(migDir)) {
    return [];
  }
  return fs
    .readdirSync(migDir, { withFileTypes: true })
    .filter((d) => {
      if (!d.isDirectory() || d.name.startsWith("_")) {
        return false;
      }
      return fs.existsSync(path.join(migDir, d.name, "migration.sql"));
    })
    .map((d) => d.name)
    .sort();
}

async function listAppliedMigrationNames(): Promise<string[] | null> {
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at ASC
    `;
    return rows.map((r) => r.migration_name);
  } catch {
    return null;
  }
}

function buildNotices(params: {
  dbOk: boolean;
  dbError?: string;
  expected: string[];
  applied: string[] | null;
  pending: string[];
  extraInDb: string[];
}): SystemNotice[] {
  const notices: SystemNotice[] = [];

  if (!params.dbOk) {
    notices.push({
      id: "db_unreachable",
      severity: "critical",
      title: "База данных недоступна",
      detail:
        params.dbError?.trim() ||
        "Не удалось выполнить запрос к PostgreSQL. API и проверки ролей будут отвечать ошибками.",
      commands: [
        "Локально (Docker): из корня репозитория",
        "docker compose -f deploy/docker-compose.yml up -d postgres",
        "Если используете --env-file, проверьте что файл существует: deploy/.env",
        "На сервере: cd deploy && docker compose --env-file .env up -d postgres",
        "Проверить DATABASE_URL в backend/.env или в deploy (сервис backend).",
        "Сверка портов: DATABASE_URL.port должен совпадать с host-портом Docker (обычно 5432).",
      ],
      aiPrompt:
        "В проекте CRM backend не подключается к PostgreSQL. Ошибка: " +
        (params.dbError ?? "unknown") +
        ". Проверь docker-compose.yml в корне репозитория, health postgres, DATABASE_URL, логи: docker compose logs -f postgres backend. Предложи конкретные шаги исправления.",
    });
    return notices;
  }

  if (params.applied === null) {
    notices.push({
      id: "migrations_table_missing",
      severity: "critical",
      title: "Не удалось прочитать таблицу миграций",
      detail:
        "Запрос к _prisma_migrations не выполнился. Возможна пустая или повреждённая схема — нужны миграции.",
      commands: [
        "Локально (PowerShell, из корня репозитория): cd backend; npx prisma migrate deploy",
        "Локально (bash): cd backend && npx prisma migrate deploy",
        "Docker (из корня репозитория): docker compose --env-file deploy/.env exec backend npx prisma migrate deploy",
        "На сервере (из каталога deploy): docker compose --env-file .env exec backend npx prisma migrate deploy",
        "После правок образа: пересобрать backend — entrypoint выполнит migrate deploy.",
      ],
      aiPrompt:
        "В CRM Prisma не читает _prisma_migrations при живой БД. Разбери причину (права, схема public, пустая БД), предложи команды prisma migrate deploy или восстановление.",
    });
    return notices;
  }

  if (params.pending.length > 0) {
    const list = params.pending.join(", ");
    notices.push({
      id: "migrations_pending",
      severity: "critical",
      title: "Есть неприменённые миграции",
      detail: `В коде образа есть миграции, которых нет в БД: ${list}. Пока они не применены, схема может не совпадать с кодом (ошибки API).`,
      commands: [
        "Локально (PowerShell): cd backend; npx prisma migrate deploy",
        "Локально (bash): cd backend && npx prisma migrate deploy",
        "Docker из корня репо: docker compose --env-file deploy/.env up -d --build backend",
        "Или только migrate: docker compose --env-file deploy/.env exec backend npx prisma migrate deploy",
        "Сервер (Linux, bash): cd deploy && ./deploy.sh — entrypoint выполнит migrate deploy",
        "Сервер вручную (из deploy): docker compose --env-file .env exec backend npx prisma migrate deploy",
        "Логи backend: docker compose --env-file deploy/.env logs -f backend",
      ],
      aiPrompt:
        "В CRM не применены миграции Prisma: " +
        list +
        ". Объясни безопасно применить migrate deploy: локально в Windows PowerShell (cd backend; npx prisma migrate deploy), в Docker из корня репо (docker compose --env-file deploy/.env), entrypoint-backend.sh, как проверить логи и что не делать (migrate reset на проде).",
    });
  }

  if (params.extraInDb.length > 0) {
    notices.push({
      id: "migrations_extra_in_db",
      severity: "warning",
      title: "В БД есть миграции, которых нет в текущем коде",
      detail: `Имена: ${params.extraInDb.join(", ")}. Обычно это другая версия образа или ручные правки. Сверьте версию деплоя с репозиторием.`,
      commands: [
        "Сверить git SHA образа / WEB_BUILD_ID с веткой на GitHub.",
        "Не запускать migrate reset на продакшене без бэкапа.",
        "Обратиться к разработчикам, если рассинхрон после восстановления БД из архива.",
      ],
      aiPrompt:
        "В CRM в _prisma_migrations есть записи, отсутствующие в prisma/migrations текущего кода: " +
        params.extraInDb.join(", ") +
        ". Помоги безопасно диагностировать рассинхрон версий и что проверить на сервере.",
    });
  }

  if (notices.length === 0) {
    notices.push({
      id: "all_ok",
      severity: "info",
      title: "Критичных предупреждений нет",
      detail:
        "База отвечает, миграции из образа применены. При сбоях API смотрите логи backend и поле requestId в ответе.",
      commands: [
        "Логи backend: cd deploy && docker compose --env-file .env logs -f backend",
        "Шпаргалка: deploy/README.md и docs/dev-logs-and-diagnostics.md",
      ],
      aiPrompt:
        "Кратко опиши, как в проекте CRM смотреть логи Docker backend, искать JSON-диагностику и requestId при ошибке 500.",
    });
  }

  return notices;
}

export async function getSystemStatus(): Promise<SystemStatusPayload> {
  const expected = listExpectedMigrationFolders();
  const dbConnection = parseDbConnectionInfo();
  let dbOk = false;
  let latencyMs: number | undefined;
  let dbError: string | undefined;

  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    latencyMs = Date.now() - t0;
  } catch (e) {
    dbOk = false;
    dbError = e instanceof Error ? e.message : String(e);
  }

  let applied: string[] | null = null;
  if (dbOk) {
    applied = await listAppliedMigrationNames();
  }

  const appliedSet = applied ? new Set(applied) : null;
  const expectedSet = new Set(expected);

  const pending =
    appliedSet && expected.length >= 0
      ? expected.filter((n) => !appliedSet!.has(n))
      : [];
  const extraInDb =
    applied && expected.length >= 0
      ? applied.filter((n) => !expectedSet.has(n))
      : [];

  const notices = buildNotices({
    dbOk,
    dbError,
    expected,
    applied,
    pending,
    extraInDb,
  });

  return {
    db: dbOk
      ? { ok: true, latencyMs }
      : { ok: false, error: dbError },
    dbConnection,
    migrations: {
      expectedCount: expected.length,
      appliedCount: applied?.length ?? null,
      pendingNames: pending,
      extraInDbNames: extraInDb,
    },
    notices,
    environment: { nodeEnv: config.nodeEnv },
  };
}
