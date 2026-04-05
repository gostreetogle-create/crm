import type { Article, Complex, Product } from "@prisma/client";

/** JSON для `price`: DECIMAL(12,2) из Prisma → number. */
export function decimalPriceToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export type ComplexJson = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapComplexToJson(row: Complex): ComplexJson {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type CatalogProductJson = {
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

export function mapCatalogProductToJson(
  row: Product & { complex?: { id: string; name: string } },
): CatalogProductJson {
  const base: CatalogProductJson = {
    id: row.id,
    complexId: row.complexId,
    name: row.name,
    code: row.code,
    description: row.description,
    price: decimalPriceToNumber(row.price),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.complex) {
    base.complex = { id: row.complex.id, name: row.complex.name };
  }
  return base;
}

export type CatalogArticleJson = {
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

export function mapCatalogArticleToJson(
  row: Article & { product?: { id: string; name: string; complexId: string } },
): CatalogArticleJson {
  const base: CatalogArticleJson = {
    id: row.id,
    productId: row.productId,
    name: row.name,
    code: row.code,
    description: row.description,
    qty: row.qty,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.product) {
    base.product = {
      id: row.product.id,
      name: row.product.name,
      complexId: row.product.complexId,
    };
  }
  return base;
}
