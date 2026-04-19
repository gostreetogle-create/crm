import type { Response } from "express";

const NOT_FOUND_BODY = { error: "not_found" as const };

/** HTTP 404 для отсутствующего КП — единый контракт ответа. */
export function respondCommercialOfferNotFound(res: Response): void {
  res.status(404).json(NOT_FOUND_BODY);
}

/** Если записи нет — отправляет 404 и возвращает `false`. */
export function guardCommercialOfferRow<T>(row: T | null | undefined, res: Response): row is T {
  if (row == null) {
    respondCommercialOfferNotFound(res);
    return false;
  }
  return true;
}

/** HTTP 409: КП в статусе «оплачено», правки запрещены. */
export function respondPaidOfferLocked(res: Response): void {
  res.status(409).json({ error: "paid_offer_locked" });
}
