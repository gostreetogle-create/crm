import { AUTHZ_PERMISSION_KEY_SET } from './authz-permission-keys.js';

/** Единая санитизация матрицы при чтении из БД и при записи (неизвестные роли, ключи, dict.hub без раздела). */
export function sanitizeAuthzMatrixPayload(
  matrix: Record<string, string[]>,
  knownRoleIds: ReadonlySet<string>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [roleId, keys] of Object.entries(matrix)) {
    if (!knownRoleIds.has(roleId) || !Array.isArray(keys)) {
      continue;
    }
    let validKeys = keys.filter((k) => AUTHZ_PERMISSION_KEY_SET.has(k));
    if (!validKeys.includes('page.dictionaries')) {
      validKeys = validKeys.filter((k) => !k.startsWith('dict.hub.'));
    }
    /** Пустой массив — явное «нет прав» для роли, не опускать из JSON. */
    out[roleId] = validKeys;
  }
  return out;
}

const PAGE_DICTIONARIES = 'page.dictionaries';
const HUB_PRODUCTS = 'dict.hub.products';
const HUB_TRADE_GOODS = 'dict.hub.trade_goods';
const HUB_CATALOG_SUITE = 'dict.hub.catalog_suite';

/**
 * Матрица в БД могла быть сохранена до появления новых ключей `dict.hub.*`.
 * — «Изделия» → добавить «Товары» (TradeGood).
 * — «Товары» → добавить «Комплексы и каталог» (complexes / catalog-products / catalog-articles).
 */
export function augmentAuthzMatrixImplicitHubKeys(matrix: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [roleId, keys] of Object.entries(matrix)) {
    let next = [...keys];
    if (
      next.includes(PAGE_DICTIONARIES) &&
      next.includes(HUB_PRODUCTS) &&
      !next.includes(HUB_TRADE_GOODS) &&
      AUTHZ_PERMISSION_KEY_SET.has(HUB_TRADE_GOODS)
    ) {
      next = [...next, HUB_TRADE_GOODS];
    }
    if (
      next.includes(PAGE_DICTIONARIES) &&
      next.includes(HUB_TRADE_GOODS) &&
      !next.includes(HUB_CATALOG_SUITE) &&
      AUTHZ_PERMISSION_KEY_SET.has(HUB_CATALOG_SUITE)
    ) {
      next = [...next, HUB_CATALOG_SUITE];
    }
    out[roleId] = next;
  }
  return out;
}
