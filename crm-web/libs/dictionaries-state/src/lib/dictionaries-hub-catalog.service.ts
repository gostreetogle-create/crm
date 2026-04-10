import { inject, Injectable } from '@angular/core';
import {
  PRODUCTS_REPOSITORY,
  type ProductItem,
  type ProductItemInput,
  type ProductListItem,
  type ProductsRepository,
} from '@srm/products-data-access';
import {
  TRADE_GOODS_REPOSITORY,
  type TradeGoodItem,
  type TradeGoodItemInput,
  type TradeGoodListItem,
  type TradeGoodsPage,
  type TradeGoodsRepository,
} from '@srm/trade-goods-data-access';
import {
  hubCatalogLoadProductById,
  hubCatalogLoadProductListItems,
  hubCatalogLoadTradeGoodById,
  hubCatalogLoadTradeGoodListPage,
  hubCatalogLoadTradeGoodListItems,
  hubCatalogRemoveTradeGood,
  hubCatalogSaveProduct,
  hubCatalogSaveTradeGood,
  hubCatalogUploadTradeGoodPhotos,
} from './dictionaries-hub-catalog.operations';

/**
 * CRUD/загрузка каталога «Изделия» и «Торговые товары» для хаба справочников.
 * Сетевые вызовы сосредоточены здесь, а не в page-компоненте.
 */
/** Регистрируется в `DICTIONARIES_ROUTE_PROVIDERS` — нужны `PRODUCTS_REPOSITORY` / `TRADE_GOODS_REPOSITORY` с маршрута. */
@Injectable()
export class DictionariesHubCatalogService {
  private readonly productsRepo = inject<ProductsRepository>(PRODUCTS_REPOSITORY);
  private readonly tradeGoodsRepo = inject<TradeGoodsRepository>(TRADE_GOODS_REPOSITORY);

  loadProductById(id: string): Promise<ProductItem> {
    return hubCatalogLoadProductById(this.productsRepo, id);
  }

  saveProduct(editId: string | null, payload: ProductItemInput): Promise<ProductItem> {
    return hubCatalogSaveProduct(this.productsRepo, editId, payload);
  }

  loadProductListItems(): Promise<ProductListItem[]> {
    return hubCatalogLoadProductListItems(this.productsRepo);
  }

  loadTradeGoodById(id: string): Promise<TradeGoodItem> {
    return hubCatalogLoadTradeGoodById(this.tradeGoodsRepo, id);
  }

  saveTradeGood(editId: string | null, payload: TradeGoodItemInput): Promise<TradeGoodItem> {
    return hubCatalogSaveTradeGood(this.tradeGoodsRepo, editId, payload);
  }

  uploadTradeGoodPhotos(id: string, files: File[], primaryIndex: number): Promise<TradeGoodItem> {
    return hubCatalogUploadTradeGoodPhotos(this.tradeGoodsRepo, id, files, primaryIndex);
  }

  removeTradeGood(id: string, options?: { deleteRelated?: boolean }): Promise<void> {
    return hubCatalogRemoveTradeGood(this.tradeGoodsRepo, id, options);
  }

  loadTradeGoodListItems(): Promise<TradeGoodListItem[]> {
    return hubCatalogLoadTradeGoodListItems(this.tradeGoodsRepo);
  }

  loadTradeGoodListPage(page: number, pageSize: number): Promise<TradeGoodsPage> {
    return hubCatalogLoadTradeGoodListPage(this.tradeGoodsRepo, page, pageSize);
  }
}
