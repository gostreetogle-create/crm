function isObjectWithStatus(error: unknown): error is { status?: number; url?: string | null } {
  return typeof error === 'object' && error !== null && 'status' in error;
}

/** 401/403 — жёсткий отказ авторизации (logout), без привязки к `HttpErrorResponse`. */
export function isUnauthorizedHttpError(error: unknown): boolean {
  if (!isObjectWithStatus(error)) {
    return false;
  }
  const s = error.status;
  return s === 401 || s === 403;
}

export function describeAuthHttpError(error: unknown): string {
  if (isObjectWithStatus(error) && typeof error.status === 'number') {
    const url = 'url' in error ? String((error as { url?: string | null }).url ?? 'unknown') : 'unknown';
    return `HttpErrorResponse(status=${error.status}, url=${url})`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
