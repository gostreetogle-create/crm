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

/** Готовый блок «скопировал — вставил в терминал»; `label` — что это за сценарий. */
export type SystemNoticeCommand = {
  label: string;
  snippet: string;
};

export type SystemNotice = {
  id: string;
  severity: "info" | "warning" | "critical";
  /** Короткий заголовок карточки */
  title: string;
  /** Одна строка: в чём суть проблемы или статуса */
  summary: string;
  /** Простым языком: что сделать дальше (без потока лога) */
  nextSteps: string;
  commands: SystemNoticeCommand[];
  /** Дополнительно для ИИ; в UI можно свернуть */
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
    const errShort =
      params.dbError?.trim().slice(0, 100) ||
      "С базой не получается связаться.";
    notices.push({
      id: "db_unreachable",
      severity: "critical",
      title: "База не отвечает",
      summary: errShort,
      nextSteps:
        "Чаще всего не запущен Postgres или неверный DATABASE_URL в backend/.env. Сначала команда 1, потом обнови страницу.",
      commands: [
        {
          label: "1. Запустить Postgres",
          snippet: "docker compose up -d postgres",
        },
        {
          label: "2. Если контейнер есть, но выключен",
          snippet: "docker start crm_postgres",
        },
        {
          label: "3. Посмотреть DATABASE_URL",
          snippet: 'Get-Content .\\backend\\.env | Select-String "DATABASE_URL"',
        },
      ],
      aiPrompt:
        "В проекте CRM backend не подключается к PostgreSQL. Ошибка: " +
        (params.dbError ?? "unknown") +
        ". Проверь docker-compose в корне репозитория, контейнер crm_postgres, DATABASE_URL в backend/.env, логи: docker compose logs -f postgres. Предложи конкретные шаги исправления.",
    });
    return notices;
  }

  if (params.applied === null) {
    notices.push({
      id: "migrations_table_missing",
      severity: "critical",
      title: "База не готова",
      summary: "База пустая, другая или не та строка подключения в .env.",
      nextSteps: "Сначала команда 1. Не помогло — проверь backend/.env. Потом «Обновить» на этой странице.",
      commands: [
        {
          label: "1. Применить миграции",
          snippet: "cd backend; npx prisma migrate deploy",
        },
        {
          label: "2. Если ошибка Prisma Client",
          snippet: "cd backend; npx prisma generate; npx prisma migrate deploy",
        },
        {
          label: "3. Если backend в Docker",
          snippet: "docker compose exec backend npx prisma migrate deploy",
        },
      ],
      aiPrompt:
        "В CRM Prisma не читает _prisma_migrations при живой БД. Разбери причину (права, схема public, пустая БД), предложи команды prisma migrate deploy или восстановление.",
    });
    return notices;
  }

  if (params.pending.length > 0) {
    const list = params.pending.join(", ");
    const count = params.pending.length;
    notices.push({
      id: "migrations_pending",
      severity: "critical",
      title: "Миграции не совпадают",
      summary:
        count === 1
          ? `В коде есть обновление базы, которого нет в базе: ${list}.`
          : `В коде не хватает ${count} обновлений базы. Первое: ${params.pending[0]}.`,
      nextSteps:
        "Сделай команду 1, дождись конца, нажми «Обновить проверку». migrate reset на живой базе не запускай — сотрёт данные.",
      commands: [
        {
          label: "1. Применить миграции",
          snippet: "cd backend; npx prisma migrate deploy",
        },
        {
          label: "2. После git pull",
          snippet: "cd backend; npm install; npx prisma generate; npx prisma migrate deploy",
        },
        {
          label: "3. Backend в Docker",
          snippet: "docker compose exec backend npx prisma migrate deploy",
        },
      ],
      aiPrompt:
        "В CRM не применены миграции Prisma: " +
        list +
        ". Объясни безопасно применить migrate deploy: локально Windows PowerShell (cd backend; npx prisma migrate deploy), Docker (docker compose exec backend), что не делать (migrate reset на проде).",
    });
  }

  if (params.extraInDb.length > 0) {
    const first = params.extraInDb[0]!;
    const extraSummary =
      params.extraInDb.length === 1
        ? `В базе есть миграция, которой нет у тебя в коде: ${first}.`
        : `В базе есть миграции, которых нет у тебя в коде: ${params.extraInDb.slice(0, 3).join(", ")}${params.extraInDb.length > 3 ? ` и ещё ${params.extraInDb.length - 3}` : ""}.`;
    notices.push({
      id: "migrations_extra_in_db",
      severity: "warning",
      title: "Миграция из другой версии",
      summary: extraSummary,
      nextSteps:
        "Обычно база новее или старее твоего кода. Подтяни тот же коммит, что на сервере, или базу под свой код. reset без бэкапа не делай.",
      commands: [
        {
          label: "1. Какой сейчас коммит",
          snippet: "git log -1 --oneline",
        },
        {
          label: "2. Какая ветка",
          snippet: "git branch --show-current",
        },
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
      title: "Всё в порядке",
      summary: "База отвечает, миграции совпадают с кодом.",
      nextSteps: "Если сайт глючит — смотри логи backend. После git pull зайди сюда снова.",
      commands: [
        {
          label: "1. Логи backend",
          snippet: "docker compose logs -f backend",
        },
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
