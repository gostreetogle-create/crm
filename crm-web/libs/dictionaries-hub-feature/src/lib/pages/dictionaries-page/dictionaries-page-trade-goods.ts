import type { TradeGoodItemInput } from '@srm/trade-goods-data-access';

/** Payload товара (набор изделий) для API. */
export function tradeGoodPayloadFromValues(v: {
  code: string;
  name: string;
  description: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string;
  isActive: boolean;
  lines: Array<{ productId: string; qty: number }>;
}): TradeGoodItemInput {
  return {
    code: v.code.trim() || null,
    name: v.name.trim(),
    description: v.description.trim() || null,
    priceRub: v.priceRub,
    costRub: v.costRub,
    notes: v.notes.trim() || null,
    isActive: v.isActive,
    lines: v.lines.map((line, idx) => ({
      sortOrder: idx,
      productId: line.productId,
      qty: line.qty > 0 ? line.qty : 1,
    })),
  };
}
