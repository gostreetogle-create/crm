/**
 * Минимальный канал логов без внешних SDK. В dev — console; в prod можно подменить обработчиком.
 */
export function logAppEvent(scope: string, message: string, detail?: unknown): void {
  if (detail === undefined) {
    console.info(`[${scope}] ${message}`);
    return;
  }
  console.info(`[${scope}] ${message}`, detail);
}

export function logAppError(scope: string, message: string, error?: unknown): void {
  if (error === undefined) {
    console.error(`[${scope}] ${message}`);
    return;
  }
  console.error(`[${scope}] ${message}`, error);
}
