import type { KpCatalogProduct } from '../kp-catalog-vitrine/kp-catalog-product.model';

export type KpCatalogProductSort = 'priceAsc' | 'priceDesc';

/** Служебное значение фильтра «подкатегория не задана». */
export const KP_CATALOG_SUBCATEGORY_NONE_VALUE = '__none__';

export function kpCatalogSubcategoryText(p: KpCatalogProduct): string {
  return (p.subcategory ?? '').trim();
}

export function formatKpCatalogCardMetaLine(p: KpCatalogProduct): string {
  const sub = kpCatalogSubcategoryText(p);
  return sub ? `${p.category} · ${sub}` : p.category;
}

export function filterSortProductsForVitrine(
  products: readonly KpCatalogProduct[],
  termRaw: unknown,
  category: string,
  subcategory: string,
  sort: KpCatalogProductSort,
): KpCatalogProduct[] {
  const term = String(termRaw ?? '').trim().toLowerCase();

  const items = products
    .filter((p) => (category === 'all' ? true : p.category === category))
    .filter((p) => {
      if (category === 'all' || subcategory === 'all') return true;
      const s = kpCatalogSubcategoryText(p);
      if (subcategory === KP_CATALOG_SUBCATEGORY_NONE_VALUE) return s === '';
      return s === subcategory;
    })
    .filter((p) => {
      if (!term) return true;
      const sub = kpCatalogSubcategoryText(p);
      return (
        p.title.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        sub.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sort === 'priceAsc') return a.price - b.price;
      return b.price - a.price;
    });

  return items;
}

export function calcKpCatalogProductPageCount(filteredLength: number, pageSize: number): number {
  return Math.max(1, Math.ceil(filteredLength / pageSize));
}

export function clampKpCatalogPage(page: number, pageCount: number): number {
  return Math.min(Math.max(1, page), pageCount);
}

export function sliceKpCatalogVisibleProducts(
  filtered: readonly KpCatalogProduct[],
  page: number,
  pageSize: number,
): KpCatalogProduct[] {
  const pageCount = calcKpCatalogProductPageCount(filtered.length, pageSize);
  const current = clampKpCatalogPage(page, pageCount);
  const start = (current - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}

export function parseKpCatalogPageSize(valueRaw: unknown, defaultValue = 12): number {
  const n = Number.parseInt(String(valueRaw ?? ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : defaultValue;
}

export function tryParseKpCatalogPageSize(valueRaw: unknown): number | null {
  const n = Number.parseInt(String(valueRaw ?? ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function formatKpCatalogPriceRuble(rub: number): string {
  return rub.toLocaleString('ru-RU') + ' ₽';
}

