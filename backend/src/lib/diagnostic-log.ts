import fs from "node:fs";

/** Одна строка JSON в stderr (+ опционально в файл) — удобно для `docker logs` и для ИИ/grep. */
export type DiagnosticPayload = {
  ts: string;
  type: string;
  requestId?: string;
  method?: string;
  path?: string;
  message: string;
  name?: string;
  stack?: string;
};

const logFile = process.env.CRM_DIAGNOSTIC_LOG_FILE?.trim();

export function writeDiagnostic(payload: DiagnosticPayload): void {
  const line = `${JSON.stringify(payload)}\n`;
  // eslint-disable-next-line no-console
  console.error(line.trimEnd());
  if (!logFile) {
    return;
  }
  try {
    fs.appendFileSync(logFile, line, { encoding: "utf8" });
  } catch {
    // не ломаем запрос из‑за диска
  }
}
