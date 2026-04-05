import {
  cleanupOldBackups,
  createBackupDump,
  currentMatchesScheduleTime,
  DbBackupCommandError,
  isBackupJobRunning,
  readSchedule,
  setLastRunDate,
  todayYmdLocal,
  withBackupJob,
} from "./db-backup.js";
import { writeDiagnostic } from "./diagnostic-log.js";

let interval: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
  try {
    const sch = await readSchedule();
    if (!sch.enabled) return;
    if (!currentMatchesScheduleTime(sch.timeHHmm)) return;
    const today = todayYmdLocal();
    if (sch.lastRunDate === today) return;
    if (isBackupJobRunning()) return;
    await withBackupJob(async () => {
      await createBackupDump();
      await setLastRunDate(today);
      await cleanupOldBackups(sch.retentionDays);
    });
  } catch (e) {
    const stack = e instanceof Error ? e.stack : undefined;
    const message =
      e instanceof DbBackupCommandError
        ? e.detail
        : e instanceof Error
          ? e.message
          : String(e);
    writeDiagnostic({
      ts: new Date().toISOString(),
      type: "backup_scheduler_error",
      message,
      name: e instanceof Error ? e.name : "Error",
      stack: stack ? stack.slice(0, 2000) : undefined,
    });
  }
}

export function startDbBackupScheduler(): void {
  if (interval) return;
  interval = setInterval(() => {
    void tick();
  }, 60_000);
  void tick();
}
