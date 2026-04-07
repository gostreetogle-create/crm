import type { TradeGoodItemInput } from '@srm/trade-goods-data-access';

/** Payload товара (набор изделий) для API. */
export function tradeGoodPayloadFromValues(v: {
  code: string;
  name: string;
  description: string;
  kind: 'ITEM' | 'COMPLEX';
  categoryId: string;
  subcategoryId: string;
  unitCode: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string;
  isActive: boolean;
  /** Номер главного слота `артикул_N` (1-based). */
  photoPrimaryIndex: number;
  lines: Array<{ productId: string | null; tradeGoodId: string | null; qty: number }>;
}): TradeGoodItemInput {
  return {
    code: v.code.trim() || null,
    name: v.name.trim(),
    description: v.description.trim() || null,
    categoryId: v.categoryId.trim() || null,
    subcategoryId: v.subcategoryId.trim() || null,
    unitCode: v.unitCode.trim() || null,
    priceRub: v.priceRub,
    costRub: v.costRub,
    notes: v.notes.trim() || null,
    isActive: v.isActive,
    kind: v.kind,
    photoPrimaryIndex: v.photoPrimaryIndex,
    lines: v.lines.map((line, idx) => ({
      sortOrder: idx,
      productId: line.productId?.trim() || null,
      tradeGoodId: line.tradeGoodId?.trim() || null,
      qty: line.qty > 0 ? line.qty : 1,
    })),
  };
}
