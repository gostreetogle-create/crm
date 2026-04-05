export type TradeGoodLineDto = {
  id: string;
  sortOrder: number;
  productId: string;
  qty: number;
  product: {
    id: string;
    code: string | null;
    name: string;
    priceRub: number | null;
    costRub: number | null;
  };
};

export type TradeGoodItem = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
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
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  linesCount: number;
  productsSummary: string;
  compositionLines: TradeGoodCompositionLineListItem[];
  createdAt: string;
  updatedAt: string;
};

export type TradeGoodLineInput = {
  id?: string | null;
  sortOrder?: number;
  productId: string;
  qty?: number;
};

export type TradeGoodItemInput = {
  code: string | null;
  name: string;
  description: string | null;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  lines: TradeGoodLineInput[];
};
