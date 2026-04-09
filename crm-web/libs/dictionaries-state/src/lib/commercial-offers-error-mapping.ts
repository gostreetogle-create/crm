function asHttpError(err: unknown): { error: unknown } | null {
  if (!err || typeof err !== 'object') return null;
  if (!('error' in err)) return null;
  return err as { error: unknown };
}

export function mapCommercialOfferStatusError(err: unknown): string {
  const httpErr = asHttpError(err);
  if (httpErr) {
    const body = httpErr.error;
    const code =
      body && typeof body === 'object' && 'error' in body ? String((body as { error?: unknown }).error ?? '') : '';
    if (code === 'illegal_status_transition') {
      return 'Недопустимый переход статуса для этого КП.';
    }
    if (code === 'paid_offer_locked') {
      return 'Оплаченное КП заблокировано для изменения статуса.';
    }
    if (code === 'invalid_current_status') {
      return 'Текущий статус КП не распознан. Обновите список и попробуйте снова.';
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const message = String((body as { message?: unknown }).message ?? '').trim();
      if (message) return message;
    }
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return 'Не удалось изменить статус коммерческого предложения';
}

export function mapCommercialOfferDeleteError(err: unknown): string {
  const httpErr = asHttpError(err);
  if (httpErr) {
    const body = httpErr.error;
    const code =
      body && typeof body === 'object' && 'error' in body ? String((body as { error?: unknown }).error ?? '') : '';
    if (code === 'paid_offer_locked') {
      return 'Оплаченное КП нельзя удалить напрямую. Если для него создан заказ — сначала удалите заказ.';
    }
    if (code === 'offer_has_order') {
      const order =
        body && typeof body === 'object' && 'order' in body
          ? (body as { order?: { number?: unknown } }).order
          : undefined;
      const orderNum = String(order?.number ?? '').trim();
      if (orderNum) {
        return `КП связано с заказом № ${orderNum}. Сначала удалите заказ, затем КП.`;
      }
      return 'КП связано с заказом. Сначала удалите заказ, затем КП.';
    }
    if (code === 'not_found') {
      return 'КП уже удалено или не найдено.';
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const message = String((body as { message?: unknown }).message ?? '').trim();
      if (message) return message;
    }
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return 'Не удалось удалить коммерческое предложение';
}
