import {
  cleanupOldBackups,
  createBackupDump,
  currentMatchesScheduleTime,
  isBackupJobRunning,
  readSchedule,
  setLastRunDate,
  todayYmdLocal,
  withBackupJob,
} from "./db-backup.js";

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
  } catch {
    // автобэкап не должен ронять процесс; детали — в логах при необходимости
  }
}

export function startDbBackupScheduler(): void {
  if (interval) return;
  interval = setInterval(() => {
    void tick();
  }, 60_000);
  void tick();
}
