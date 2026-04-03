import type { ProductItemInput } from '@srm/products-data-access';

/** Сбор payload изделия из значений формы (строки состава — plain objects). */
export function productPayloadFromValues(v: {
  name: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string;
  isActive: boolean;
  /** Один вид работ на всё изделие — дублируется в каждую строку API. */
  workTypeId: string;
  /** Один цвет на всё изделие — дублируется в каждую строку API. */
  colorId: string;
  lines: Array<{
    productionDetailId: string;
  }>;
}): ProductItemInput {
  const lineColor = v.colorId?.trim() ? v.colorId.trim() : null;
  const lineWork = v.workTypeId?.trim() ? v.workTypeId.trim() : null;
  return {
    name: v.name.trim(),
    priceRub: v.priceRub,
    costRub: v.costRub,
    notes: v.notes.trim() || null,
    isActive: v.isActive,
    lines: v.lines.map((line, idx) => ({
      sortOrder: idx,
      productionDetailId: line.productionDetailId,
      workTypeId: lineWork,
      colorId: lineColor,
    })),
  };
}
