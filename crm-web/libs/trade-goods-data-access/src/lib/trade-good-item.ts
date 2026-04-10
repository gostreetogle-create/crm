export type TradeGoodLineDto = {
  id: string;
  sortOrder: number;
  productId: string | null;
  tradeGoodId: string | null;
  qty: number;
  product: {
    id: string;
    code: string | null;
    name: string;
    priceRub: number | null;
    costRub: number | null;
  } | null;
  tradeGood: {
    id: string;
    code: string | null;
    name: string;
    priceRub: number | null;
    costRub: number | null;
    kind: 'ITEM' | 'COMPLEX';
  } | null;
};

export type TradeGoodItem = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  /** Подписи из справочников (для таблиц и КП). */
  category: string | null;
  subcategory: string | null;
  unitCode: string | null;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  kind: 'ITEM' | 'COMPLEX';
  /** Слот главного фото `артикул_N` на диске (1-based). */
  photoPrimaryIndex: number;
  /** Все загруженные снимки (`/media/trade-goods/…`). */
  photoUrls: string[];
  /** Главное фото для карточек и КП (по `photoPrimaryIndex`). */
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
  lines: TradeGoodLineDto[];
};

export type TradeGoodCompositionLineListItem = {
  productLabel: string;
  qty: number;
};

export type TradeGoodListItem = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  category: string | null;
  subcategory: string | null;
  unitCode: string | null;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  kind: 'ITEM' | 'COMPLEX';
  photoPrimaryIndex: number;
  photoUrls: string[];
  /** Главное фото для списков и КП. */
  photoUrl: string;
  linesCount: number;
  productsSummary: string;
  compositionLines: TradeGoodCompositionLineListItem[];
  createdAt: string;
  updatedAt: string;
};

export type TradeGoodsPage = {
  data: TradeGoodListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TradeGoodLineInput = {
  id?: string | null;
  sortOrder?: number;
  productId?: string | null;
  tradeGoodId?: string | null;
  qty?: number;
};

export type TradeGoodItemInput = {
  code: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  /** Устаревшие строки: бэкенд создаёт записи справочника при импорте. */
  category?: string | null;
  subcategory?: string | null;
  unitCode: string | null;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  kind: 'ITEM' | 'COMPLEX';
  /** Какой снимок главный (`артикул_N`, 1-based); при смене без новой загрузки — только PUT. */
  photoPrimaryIndex?: number;
  lines: TradeGoodLineInput[];
};
