import { Router } from "express";
import path from "node:path";
import { z } from "zod";
import {
  BACKUP_FILE_RE,
  cleanupOldBackups,
  createBackupDump,
  DbBackupCommandError,
  deleteBackupFile,
  getBackupDir,
  isBackupJobRunning,
  isValidTimeHHmm,
  listBackups,
  readSchedule,
  restoreFromDump,
  withBackupJob,
  writeSchedule,
} from "../lib/db-backup.js";
import { refreshPrismaConnectionPool } from "../lib/prisma-pool-refresh.js";

export const dbBackupsRouter = Router();

/** Каталог с `docker-compose.yml` на сервере — для текста «выполните команду…» в ответе API. */
function manualBackendRestartCommand(): string {
  const dir = (process.env.CRM_DEPLOY_DIR ?? "/opt/crm/deploy").trim().replace(/\/$/, "");
  return `cd ${dir} && docker compose restart backend`;
}

const SchedulePutSchema = z.object({
  enabled: z.boolean(),
  timeHHmm: z.string().min(4).max(5),
  retentionDays: z.number().int().min(1).max(365).optional(),
});

dbBackupsRouter.get("/schedule", async (_req, res, next) => {
  try {
    const s = await readSchedule();
    res.json(s);
  } catch (e) {
    next(e);
  }
});

dbBackupsRouter.put("/schedule", async (req, res, next) => {
  try {
    const parsed = SchedulePutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const { enabled, timeHHmm, retentionDays } = parsed.data;
    if (!isValidTimeHHmm(timeHHmm)) {
      res.status(400).json({ error: "invalid_time" });
      return;
    }
    const s = await writeSchedule({
      enabled,
      timeHHmm,
      ...(retentionDays !== undefined ? { retentionDays } : {}),
    });
    res.json(s);
  } catch (e) {
    next(e);
  }
});

dbBackupsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await listBackups();
    res.json({ items, backupDir: getBackupDir() });
  } catch (e) {
    next(e);
  }
});

dbBackupsRouter.post("/", async (_req, res, next) => {
  try {
    if (isBackupJobRunning()) {
      res.status(409).json({ error: "backup_busy" });
      return;
    }
    const sch = await readSchedule();
    const result = await withBackupJob(async () => {
      const r = await createBackupDump();
      await cleanupOldBackups(sch.retentionDays);
      return r;
    });
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "busy") {
      res.status(409).json({ error: "backup_busy" });
      return;
    }
    if (e instanceof DbBackupCommandError) {
      res.status(503).json({ error: "backup_failed", message: e.detail });
      return;
    }
    next(e);
  }
});

dbBackupsRouter.delete("/:fileName", async (req, res, next) => {
  try {
    const fileName = req.params.fileName;
    if (!BACKUP_FILE_RE.test(fileName)) {
      res.status(400).json({ error: "invalid_file" });
      return;
    }
    await deleteBackupFile(fileName);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

dbBackupsRouter.post("/:fileName/restore", async (req, res, next) => {
  try {
    const fileName = req.params.fileName;
    if (!BACKUP_FILE_RE.test(fileName)) {
      res.status(400).json({ error: "invalid_file" });
      return;
    }
    if (isBackupJobRunning()) {
      res.status(409).json({ error: "backup_busy" });
      return;
    }
    const conn = await withBackupJob(() => restoreFromDump(fileName));
    const pool = await refreshPrismaConnectionPool();
    const restartCmd = manualBackendRestartCommand();

    const userMessage = pool.ok
      ? "База успешно восстановлена из архива."
      : `База восстановлена из архива. Автоматически переподключить приложение к базе не удалось (${pool.error}). На сервере выполните:\n${restartCmd}`;

    res.json({
      ok: true,
      pgToolsSource: conn.source,
      pgToolsHostPort: conn.hostPort,
      prismaPoolRefreshed: pool.ok,
      ...(pool.ok ? {} : { prismaPoolRefreshError: pool.error, manualRestartCommand: restartCmd }),
      userMessage,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "busy") {
      res.status(409).json({ error: "backup_busy" });
      return;
    }
    if (e instanceof DbBackupCommandError) {
      res.status(503).json({ error: "backup_failed", message: e.detail });
      return;
    }
    next(e);
  }
});

dbBackupsRouter.get("/:fileName/download", async (req, res, next) => {
  try {
    const fileName = req.params.fileName;
    if (!BACKUP_FILE_RE.test(fileName)) {
      res.status(400).json({ error: "invalid_file" });
      return;
    }
    const full = path.join(getBackupDir(), fileName);
    res.download(full, fileName, (err) => {
      if (err) next(err);
    });
  } catch (e) {
    next(e);
  }
});
