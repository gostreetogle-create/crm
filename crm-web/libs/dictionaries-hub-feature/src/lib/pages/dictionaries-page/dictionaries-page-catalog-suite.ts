import type {
  CatalogArticleInput,
  CatalogProductInput,
  ComplexInput,
} from '@srm/catalog-suite-data-access';

function money(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function intPositive(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

function intNonNegative(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

export function complexPayloadFromValues(v: {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}): ComplexInput {
  const code = v.code.trim();
  const description = v.description.trim();
  return {
    name: v.name.trim(),
    code: code ? code : null,
    description: description ? description : null,
    isActive: v.isActive,
  };
}

export function catalogProductPayloadFromValues(v: {
  complexId: string;
  name: string;
  code: string;
  description: string;
  price: unknown;
  isActive: boolean;
}): CatalogProductInput {
  const code = v.code.trim();
  const description = v.description.trim();
  return {
    complexId: v.complexId.trim(),
    name: v.name.trim(),
    code: code ? code : null,
    description: description ? description : null,
    price: money(v.price),
    isActive: v.isActive,
  };
}

export function catalogArticlePayloadFromValues(v: {
  productId: string;
  name: string;
  code: string;
  description: string;
  qty: unknown;
  sortOrder: unknown;
  isActive: boolean;
}): CatalogArticleInput {
  const code = v.code.trim();
  const description = v.description.trim();
  return {
    productId: v.productId.trim(),
    name: v.name.trim(),
    code: code ? code : null,
    description: description ? description : null,
    qty: intPositive(v.qty, 1),
    sortOrder: intNonNegative(v.sortOrder, 0),
    isActive: v.isActive,
  };
}
