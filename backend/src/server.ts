import { createApp } from "./app.js";
import { config } from "./config.js";
import { writeDiagnostic } from "./lib/diagnostic-log.js";
import { startDbBackupScheduler } from "./lib/db-backup-scheduler.js";

process.on("unhandledRejection", (reason) => {
  writeDiagnostic({
    ts: new Date().toISOString(),
    type: "unhandledRejection",
    message: reason instanceof Error ? reason.message : String(reason),
    name: reason instanceof Error ? reason.name : "UnhandledRejection",
    stack:
      reason instanceof Error && reason.stack
        ? reason.stack.slice(0, 2000)
        : undefined,
  });
  if (config.nodeEnv === "production") {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  writeDiagnostic({
    ts: new Date().toISOString(),
    type: "uncaughtException",
    message: err.message,
    name: err.name,
    stack: err.stack ? err.stack.slice(0, 2000) : undefined,
  });
  process.exit(1);
});

const app = createApp();

startDbBackupScheduler();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${config.port}`);
});

