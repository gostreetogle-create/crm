import type { TradeGoodListItem } from '@srm/trade-goods-data-access';
import {
  KP_CATALOG_UNCATEGORIZED_LABEL,
  type KpCatalogProduct,
} from '../kp-catalog-vitrine/kp-catalog-product.model';

/**
 * Справочник «Товары» → карточка в боковой панели конструктора КП.
 * Превью только из `photoUrl` API (`/media/trade-goods/…` с диска бэкенда), без заглушек.
 */
export function mapTradeGoodListItemToKpCatalogProduct(tg: TradeGoodListItem): KpCatalogProduct {
  const price = tg.priceRub ?? 0;
  const defaultUnit = tg.linesCount > 1 ? 'компл.' : 'шт.';
  const photo = tg.photoUrl?.trim();
  const categoryRaw = tg.category?.trim() ?? '';
  const subRaw = tg.subcategory?.trim() ?? '';
  const category = categoryRaw || KP_CATALOG_UNCATEGORIZED_LABEL;
  return {
    id: tg.id,
    category,
    ...(subRaw ? { subcategory: subRaw } : {}),
    title: tg.name,
    sku: (tg.code?.trim() || tg.id).slice(0, 64),
    price,
    ...(photo ? { imageUrl: photo } : {}),
    defaultUnit,
    source: 'trade_good',
    description: tg.description?.trim() ?? '',
  };
}
