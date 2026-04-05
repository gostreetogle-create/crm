import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { config } from "../config.js";

export const BACKUP_FILE_RE = /^crm-backup-\d{8}-\d{6}\.dump$/;

export type DbBackupSchedule = {
  enabled: boolean;
  /** "HH:mm" (локальное время процесса Node, на сервере обычно UTC без TZ) */
  timeHHmm: string;
  /** YYYY-MM-DD — дата последнего успешного автобэкапа */
  lastRunDate: string;
  /** Сколько дней хранить каждый файл (по mtime) */
  retentionDays: number;
};

const DEFAULT_SCHEDULE: DbBackupSchedule = {
  enabled: false,
  timeHHmm: "03:00",
  lastRunDate: "",
  retentionDays: 30,
};

function scheduleFilePath(): string {
  return path.join(config.backupDir, "db-backup-schedule.json");
}

export function getBackupDir(): string {
  return config.backupDir;
}

export async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(config.backupDir, { recursive: true });
}

function parseHHmm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

export function isValidTimeHHmm(s: string): boolean {
  return parseHHmm(s) !== null;
}

export async function readSchedule(): Promise<DbBackupSchedule> {
  await ensureBackupDir();
  const p = scheduleFilePath();
  try {
    const raw = await fs.readFile(p, "utf8");
    const j = JSON.parse(raw) as Partial<DbBackupSchedule>;
    return {
      enabled: Boolean(j.enabled),
      timeHHmm:
        typeof j.timeHHmm === "string" && isValidTimeHHmm(j.timeHHmm)
          ? j.timeHHmm
          : DEFAULT_SCHEDULE.timeHHmm,
      lastRunDate: typeof j.lastRunDate === "string" ? j.lastRunDate : "",
      retentionDays:
        typeof j.retentionDays === "number" &&
        j.retentionDays >= 1 &&
        j.retentionDays <= 365
          ? j.retentionDays
          : DEFAULT_SCHEDULE.retentionDays,
    };
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

export async function writeSchedule(
  patch: Partial<Pick<DbBackupSchedule, "enabled" | "timeHHmm" | "retentionDays">>,
): Promise<DbBackupSchedule> {
  const cur = await readSchedule();
  const next: DbBackupSchedule = {
    ...cur,
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.timeHHmm !== undefined ? { timeHHmm: patch.timeHHmm } : {}),
    ...(patch.retentionDays !== undefined
      ? { retentionDays: patch.retentionDays }
      : {}),
  };
  if (!isValidTimeHHmm(next.timeHHmm)) {
    throw new Error("invalid_time");
  }
  await ensureBackupDir();
  const p = scheduleFilePath();
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, p);
  return next;
}

export async function setLastRunDate(dateYmd: string): Promise<void> {
  const cur = await readSchedule();
  const next: DbBackupSchedule = { ...cur, lastRunDate: dateYmd };
  const p = scheduleFilePath();
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, p);
}

export type BackupListItem = {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};

export async function listBackups(): Promise<BackupListItem[]> {
  await ensureBackupDir();
  const names = await fs.readdir(config.backupDir);
  const items: BackupListItem[] = [];
  for (const name of names) {
    if (!BACKUP_FILE_RE.test(name)) continue;
    const full = path.join(config.backupDir, name);
    const st = await fs.stat(full);
    if (!st.isFile()) continue;
    items.push({
      fileName: name,
      sizeBytes: st.size,
      createdAt: st.mtime.toISOString(),
    });
  }
  items.sort((a, b) => (a.fileName < b.fileName ? 1 : a.fileName > b.fileName ? -1 : 0));
  return items;
}

function runCmd(
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      const hint =
        err.code === "ENOENT"
          ? `${cmd}: not found (install PostgreSQL client tools, e.g. postgresql-client)`
          : `${cmd}: ${err.message}`;
      resolve({ code: 127, stderr: hint });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr });
    });
  });
}

/** Ошибка выполнения pg_dump/pg_restore — отдаётся клиенту с текстом из stderr (усечённым). */
export class DbBackupCommandError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super("backup_command_failed");
    this.name = "DbBackupCommandError";
    this.detail = detail.slice(0, 2000);
  }
}

function newBackupFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `crm-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.dump`;
}

/**
 * URL подключения для `pg_dump` и `pg_restore`.
 *
 * Prisma в `DATABASE_URL` часто добавляет `?schema=public`. Утилиты libpq не понимают этот
 * query-параметр и падают с: invalid URI query parameter: "schema".
 *
 * Приоритет:
 * 1. `BACKUP_DATABASE_URL` — задайте тот же DSN, что и для приложения, но **без** `?schema=...`
 *    (и без других query-параметров, если pg их не принимает).
 * 2. Иначе берётся `DATABASE_URL`, из которого отрезается всё начиная с первого `?`.
 *
 * При использовании п.2 при **первом** вызове пишется одно предупреждение в stderr (чтобы в логах
 * было видно, что задействован fallback, а не явный `BACKUP_DATABASE_URL`).
 */
/** Один раз за жизнь процесса: предупредить о fallback без BACKUP_DATABASE_URL. */
let warnedBackupDatabaseUrlFallback = false;

function connectionUrlForPgTools(): string {
  const backupUrl = process.env.BACKUP_DATABASE_URL?.trim();
  if (backupUrl) {
    return backupUrl;
  }
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!warnedBackupDatabaseUrlFallback) {
    warnedBackupDatabaseUrlFallback = true;
    console.warn(
      "BACKUP_DATABASE_URL не задан. Используем DATABASE_URL без параметров schema.",
    );
  }
  const q = dbUrl.indexOf("?");
  return q >= 0 ? dbUrl.slice(0, q) : dbUrl;
}

let backupJobRunning = false;

export function isBackupJobRunning(): boolean {
  return backupJobRunning;
}

export async function withBackupJob<T>(fn: () => Promise<T>): Promise<T> {
  if (backupJobRunning) {
    throw new Error("busy");
  }
  backupJobRunning = true;
  try {
    return await fn();
  } finally {
    backupJobRunning = false;
  }
}

export async function createBackupDump(): Promise<{ fileName: string; sizeBytes: number }> {
  await ensureBackupDir();
  const fileName = newBackupFileName();
  const full = path.join(config.backupDir, fileName);
  const url = connectionUrlForPgTools();
  const { code, stderr } = await runCmd(
    "pg_dump",
    ["-Fc", "-f", full, url],
    { ...process.env },
  );
  if (code !== 0) {
    try {
      await fs.unlink(full);
    } catch {
      // ignore
    }
    throw new DbBackupCommandError(stderr || "pg_dump failed");
  }
  const st = await fs.stat(full);
  return { fileName, sizeBytes: st.size };
}

export async function restoreFromDump(fileName: string): Promise<void> {
  if (!BACKUP_FILE_RE.test(fileName)) {
    throw new Error("invalid_file");
  }
  const full = path.join(config.backupDir, fileName);
  await fs.access(full);
  const url = connectionUrlForPgTools();
  const { code, stderr } = await runCmd(
    "pg_restore",
    ["--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", url, full],
    { ...process.env },
  );
  // pg_restore: 0 — ок, 1 — предупреждения (часто при --clean), 2 — фатальная ошибка
  if (code !== 0 && code !== 1) {
    throw new DbBackupCommandError(stderr || "pg_restore failed");
  }
}

export async function deleteBackupFile(fileName: string): Promise<void> {
  if (!BACKUP_FILE_RE.test(fileName)) {
    throw new Error("invalid_file");
  }
  const full = path.join(config.backupDir, fileName);
  await fs.unlink(full);
}

export async function cleanupOldBackups(retentionDays: number): Promise<number> {
  if (retentionDays < 1) return 0;
  await ensureBackupDir();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const names = await fs.readdir(config.backupDir);
  let removed = 0;
  for (const name of names) {
    if (!BACKUP_FILE_RE.test(name)) continue;
    const full = path.join(config.backupDir, name);
    const st = await fs.stat(full);
    if (!st.isFile()) continue;
    if (now - st.mtimeMs > maxAgeMs) {
      await fs.unlink(full);
      removed += 1;
    }
  }
  return removed;
}

export function todayYmdLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMatchesScheduleTime(timeHHmm: string): boolean {
  const p = parseHHmm(timeHHmm);
  if (!p) return false;
  const d = new Date();
  return d.getHours() === p.h && d.getMinutes() === p.m;
}
