import { firstValueFrom } from 'rxjs';
import type {
  ProductItem,
  ProductItemInput,
  ProductListItem,
  ProductsRepository,
} from '@srm/products-data-access';
import type {
  TradeGoodItem,
  TradeGoodItemInput,
  TradeGoodListItem,
  TradeGoodsRepository,
} from '@srm/trade-goods-data-access';

/** Чистые операции над репозиториями (без Angular DI) — удобно unit-тестировать в Jest. */

export async function hubCatalogLoadProductById(
  repo: ProductsRepository,
  id: string,
): Promise<ProductItem> {
  return firstValueFrom(repo.getById(id));
}

export async function hubCatalogSaveProduct(
  repo: ProductsRepository,
  editId: string | null,
  payload: ProductItemInput,
): Promise<ProductItem> {
  return editId
    ? firstValueFrom(repo.update(editId, payload))
    : firstValueFrom(repo.create(payload));
}

export async function hubCatalogLoadProductListItems(repo: ProductsRepository): Promise<ProductListItem[]> {
  return firstValueFrom(repo.getItems());
}

export async function hubCatalogLoadTradeGoodById(
  repo: TradeGoodsRepository,
  id: string,
): Promise<TradeGoodItem> {
  return firstValueFrom(repo.getById(id));
}

export async function hubCatalogSaveTradeGood(
  repo: TradeGoodsRepository,
  editId: string | null,
  payload: TradeGoodItemInput,
): Promise<TradeGoodItem> {
  return editId
    ? firstValueFrom(repo.update(editId, payload))
    : firstValueFrom(repo.create(payload));
}

export async function hubCatalogUploadTradeGoodPhotos(
  repo: TradeGoodsRepository,
  id: string,
  files: File[],
  primaryIndex: number,
): Promise<TradeGoodItem> {
  return firstValueFrom(repo.uploadPhotos(id, files, primaryIndex));
}

export async function hubCatalogRemoveTradeGood(
  repo: TradeGoodsRepository,
  id: string,
  options?: { deleteRelated?: boolean },
): Promise<void> {
  return firstValueFrom(repo.remove(id, options));
}

export async function hubCatalogLoadTradeGoodListItems(
  repo: TradeGoodsRepository,
): Promise<TradeGoodListItem[]> {
  return firstValueFrom(repo.getItems());
}
