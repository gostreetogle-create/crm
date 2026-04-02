/**
 * Расчёт итогов для справочника «Детали» по снимку ЕИ, цены и габаритов (мм).
 * Дублирует правила фронта (`dictionaries-utils/production-detail-pricing`).
 */

export type ProductionDetailPricingInput = {
  qty: number;
  snapshotPurchasePriceRub: number | null | undefined;
  snapshotUnitCode: string | null | undefined;
  snapshotUnitName: string | null | undefined;
  snapshotDensityKgM3: number | null | undefined;
  snapshotHeightMm: number | null | undefined;
  snapshotLengthMm: number | null | undefined;
  snapshotWidthMm: number | null | undefined;
  snapshotDiameterMm: number | null | undefined;
  snapshotThicknessMm: number | null | undefined;
  snapshotHourlyRateRub: number | null | undefined;
  workTimeHours: number | null | undefined;
};

function volumeM3FromDims(d: ProductionDetailPricingInput): number | null {
  const L = (d.snapshotLengthMm ?? 0) / 1000;
  const W = (d.snapshotWidthMm ?? 0) / 1000;
  const H = (d.snapshotHeightMm ?? 0) / 1000;
  const D = (d.snapshotDiameterMm ?? 0) / 1000;
  if (L > 0 && D > 0) {
    const r = D / 2;
    return Math.PI * r * r * L;
  }
  if (L > 0 && W > 0 && H > 0) return L * W * H;
  const T = (d.snapshotThicknessMm ?? 0) / 1000;
  if (L > 0 && W > 0 && T > 0) return L * W * T;
  return null;
}

function areaM2FromDims(d: ProductionDetailPricingInput): number | null {
  const L = (d.snapshotLengthMm ?? 0) / 1000;
  const W = (d.snapshotWidthMm ?? 0) / 1000;
  if (L > 0 && W > 0) return L * W;
  return null;
}

function linearM(d: ProductionDetailPricingInput): number {
  return (d.snapshotLengthMm ?? 0) / 1000;
}

export function computeProductionDetailTotals(d: ProductionDetailPricingInput): {
  materialTotalRub: number;
  workTotalRub: number;
  lineTotalRub: number;
} {
  const qty = d.qty > 0 ? d.qty : 1;
  const price = d.snapshotPurchasePriceRub ?? 0;
  const code = (d.snapshotUnitCode ?? "").toLowerCase().trim();
  const nameHint = (d.snapshotUnitName ?? "").toLowerCase();

  let material = 0;
  if (price > 0) {
    if (code === "m_run" || code === "m" || nameHint.includes("пог")) {
      material = price * linearM(d) * qty;
    } else if (code === "kg" || nameHint.includes("кг")) {
      const vol = volumeM3FromDims(d);
      const dens = d.snapshotDensityKgM3 ?? 0;
      if (vol != null && dens > 0) material = price * vol * dens * qty;
      else material = price * qty;
    } else if (code === "m2" || code === "m_2" || nameHint.includes("м²")) {
      const a = areaM2FromDims(d);
      material = a != null && a > 0 ? price * a * qty : price * qty;
    } else if (code === "m3" || code === "m_3" || nameHint.includes("м³")) {
      const v = volumeM3FromDims(d);
      material = v != null && v > 0 ? price * v * qty : price * qty;
    } else {
      material = price * qty;
    }
  }

  const rate = d.snapshotHourlyRateRub ?? 0;
  const hours = d.workTimeHours ?? 0;
  const work = rate * hours;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const mat = round2(material);
  const wrk = round2(work);
  return {
    materialTotalRub: mat,
    workTotalRub: wrk,
    lineTotalRub: round2(mat + wrk),
  };
}
