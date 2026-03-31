/** Таймаут единичного запроса `/auth/me` при bootstrap (без него init может «висеть» навсегда). */
export const AUTH_HYDRATE_ME_TIMEOUT_MS = 12_000;

/** Задержки между повторными попытками `/auth/me` после временного сбоя сети. */
export const AUTH_HYDRATE_ME_RETRY_DELAYS_MS: readonly number[] = [2_000, 5_000, 10_000];
