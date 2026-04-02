import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { computeProductionDetailTotals } from "../lib/production-detail-pricing.js";

export const productionDetailsRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();
const nullableNumber = z.union([z.number(), z.null(), z.undefined()]).optional();

const InputSchema = z.object({
  name: z.string().trim().min(1),
  code: nullableString,
  qty: z.union([z.number(), z.null(), z.undefined()]).optional(),
  notes: nullableString,
  isActive: z.boolean(),
  sourceMaterialId: nullableString,
  sourceWorkTypeId: nullableString,
  snapshotMaterialName: nullableString,
  snapshotMaterialCode: nullableString,
  snapshotUnitCode: nullableString,
  snapshotUnitName: nullableString,
  snapshotPurchasePriceRub: nullableNumber,
  snapshotDensityKgM3: nullableNumber,
  snapshotHeightMm: nullableNumber,
  snapshotLengthMm: nullableNumber,
  snapshotWidthMm: nullableNumber,
  snapshotDiameterMm: nullableNumber,
  snapshotThicknessMm: nullableNumber,
  snapshotCharacteristicName: nullableString,
  snapshotWorkTypeName: nullableString,
  snapshotWorkShortLabel: nullableString,
  snapshotHourlyRateRub: nullableNumber,
  workTimeHours: nullableNumber,
});

type Parsed = z.infer<typeof InputSchema>;

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function dataFromParsed(p: Parsed) {
  const qty = p.qty != null && Number.isFinite(p.qty) && p.qty > 0 ? p.qty : 1;
  const totals = computeProductionDetailTotals({
    qty,
    snapshotPurchasePriceRub: p.snapshotPurchasePriceRub ?? null,
    snapshotUnitCode: strOrNull(p.snapshotUnitCode),
    snapshotUnitName: strOrNull(p.snapshotUnitName),
    snapshotDensityKgM3: numOrNull(p.snapshotDensityKgM3),
    snapshotHeightMm: numOrNull(p.snapshotHeightMm),
    snapshotLengthMm: numOrNull(p.snapshotLengthMm),
    snapshotWidthMm: numOrNull(p.snapshotWidthMm),
    snapshotDiameterMm: numOrNull(p.snapshotDiameterMm),
    snapshotThicknessMm: numOrNull(p.snapshotThicknessMm),
    snapshotHourlyRateRub: numOrNull(p.snapshotHourlyRateRub),
    workTimeHours: numOrNull(p.workTimeHours),
  });
  return {
    name: p.name,
    code: strOrNull(p.code),
    qty,
    notes: strOrNull(p.notes),
    isActive: p.isActive,
    sourceMaterialId: strOrNull(p.sourceMaterialId),
    sourceWorkTypeId: strOrNull(p.sourceWorkTypeId),
    snapshotMaterialName: strOrNull(p.snapshotMaterialName),
    snapshotMaterialCode: strOrNull(p.snapshotMaterialCode),
    snapshotUnitCode: strOrNull(p.snapshotUnitCode),
    snapshotUnitName: strOrNull(p.snapshotUnitName),
    snapshotPurchasePriceRub: numOrNull(p.snapshotPurchasePriceRub),
    snapshotDensityKgM3: numOrNull(p.snapshotDensityKgM3),
    snapshotHeightMm: numOrNull(p.snapshotHeightMm),
    snapshotLengthMm: numOrNull(p.snapshotLengthMm),
    snapshotWidthMm: numOrNull(p.snapshotWidthMm),
    snapshotDiameterMm: numOrNull(p.snapshotDiameterMm),
    snapshotThicknessMm: numOrNull(p.snapshotThicknessMm),
    snapshotCharacteristicName: strOrNull(p.snapshotCharacteristicName),
    snapshotWorkTypeName: strOrNull(p.snapshotWorkTypeName),
    snapshotWorkShortLabel: strOrNull(p.snapshotWorkShortLabel),
    snapshotHourlyRateRub: numOrNull(p.snapshotHourlyRateRub),
    workTimeHours: numOrNull(p.workTimeHours),
    materialTotalRub: totals.materialTotalRub,
    workTotalRub: totals.workTotalRub,
    lineTotalRub: totals.lineTotalRub,
  };
}

function mapRow(m: {
  id: string;
  name: string;
  code: string | null;
  qty: number;
  notes: string | null;
  isActive: boolean;
  sourceMaterialId: string | null;
  sourceWorkTypeId: string | null;
  snapshotMaterialName: string | null;
  snapshotMaterialCode: string | null;
  snapshotUnitCode: string | null;
  snapshotUnitName: string | null;
  snapshotPurchasePriceRub: number | null;
  snapshotDensityKgM3: number | null;
  snapshotHeightMm: number | null;
  snapshotLengthMm: number | null;
  snapshotWidthMm: number | null;
  snapshotDiameterMm: number | null;
  snapshotThicknessMm: number | null;
  snapshotCharacteristicName: string | null;
  snapshotWorkTypeName: string | null;
  snapshotWorkShortLabel: string | null;
  snapshotHourlyRateRub: number | null;
  workTimeHours: number | null;
  materialTotalRub: number | null;
  workTotalRub: number | null;
  lineTotalRub: number | null;
}): Record<string, unknown> {
  return { ...m };
}

productionDetailsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.productionDetail.findMany({
      orderBy: { name: "asc" },
    });
    res.json(rows.map(mapRow));
  } catch (e) {
    next(e);
  }
});

productionDetailsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.productionDetail.create({
      data: dataFromParsed(parsed.data),
    });
    res.status(201).json(mapRow(row));
  } catch (e) {
    next(e);
  }
});

productionDetailsRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.productionDetail.update({
        where: { id },
        data: dataFromParsed(parsed.data),
      });
      res.json(mapRow(row));
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

productionDetailsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.productionDetail.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
