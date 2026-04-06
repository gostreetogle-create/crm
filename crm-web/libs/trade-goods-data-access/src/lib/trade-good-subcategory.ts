export type TradeGoodSubcategoryItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TradeGoodSubcategoryInput = {
  categoryId: string;
  name: string;
  sortOrder?: number;
  isActive: boolean;
};
