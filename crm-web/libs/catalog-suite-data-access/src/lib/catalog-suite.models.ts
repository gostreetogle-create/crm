/** Ответ API `/api/complexes` (элемент списка и деталь). */
export type ComplexItem = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Тело POST/PUT `/api/complexes`. */
export type ComplexInput = {
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
};

/** Каталожный товар (таблица `products`), не производственное изделие. */
export type CatalogProductItem = {
  id: string;
  complexId: string;
  name: string;
  code: string | null;
  description: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  complex?: { id: string; name: string };
};

export type CatalogProductInput = {
  complexId: string;
  name: string;
  code: string | null;
  description: string | null;
  price: number;
  isActive: boolean;
};

/** Позиция в составе каталожного товара (таблица `articles`). */
export type CatalogArticleItem = {
  id: string;
  productId: string;
  name: string;
  code: string | null;
  description: string | null;
  qty: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; complexId: string };
};

export type CatalogArticleInput = {
  productId: string;
  name: string;
  code: string | null;
  description: string | null;
  qty: number;
  isActive: boolean;
  sortOrder: number;
};
