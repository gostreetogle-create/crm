function asHttpError(err: unknown): { error: unknown } | null {
  if (!err || typeof err !== 'object') return null;
  if (!('error' in err)) return null;
  return err as { error: unknown };
}

export function mapOrderUpdateError(err: unknown): string {
  const httpErr = asHttpError(err);
  if (httpErr) {
    const body = httpErr.error;
    const code =
      body && typeof body === 'object' && 'error' in body ? String((body as { error?: unknown }).error ?? '') : '';
    if (code === 'not_found') {
      return 'Заказ не найден. Обновите список и попробуйте снова.';
    }
    if (code === 'invalid_body') {
      return 'Проверьте корректность полей заказа перед сохранением.';
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const message = String((body as { message?: unknown }).message ?? '').trim();
      if (message) return message;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return 'Не удалось обновить заказ';
}

export function mapOrderDeleteError(err: unknown): string {
  const httpErr = asHttpError(err);
  if (httpErr) {
    const body = httpErr.error;
    const code =
      body && typeof body === 'object' && 'error' in body ? String((body as { error?: unknown }).error ?? '') : '';
    if (code === 'not_found') {
      return 'Заказ уже удален или не найден.';
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const message = String((body as { message?: unknown }).message ?? '').trim();
      if (message) return message;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return 'Не удалось удалить заказ';
}
