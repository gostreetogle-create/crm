import { createApp } from './app.js';
import { config } from './config.js';
import { startDbBackupScheduler } from './lib/db-backup-scheduler.js';

const app = createApp();

startDbBackupScheduler();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${config.port}`);
});

