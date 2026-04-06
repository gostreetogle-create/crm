export type TradeGoodCategoryItem = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TradeGoodCategoryInput = {
  name: string;
  sortOrder?: number;
  isActive: boolean;
};
