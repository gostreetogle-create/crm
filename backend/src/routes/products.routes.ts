import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const productsRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();
const nullableNumber = z.union([z.number(), z.null(), z.undefined()]).optional();

const LineInputSchema = z.object({
  id: nullableString,
  sortOrder: z.number().int().optional(),
  productionDetailId: z.string().min(1),
  workTypeId: nullableString,
  colorId: nullableString,
});

const InputSchema = z.object({
  name: z.string().trim().min(1),
  priceRub: nullableNumber,
  costRub: nullableNumber,
  notes: nullableString,
  isActive: z.boolean(),
  lines: z.array(LineInputSchema).min(1),
});

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

async function sumLineTotalsForDetailIds(detailIds: string[]): Promise<number> {
  if (detailIds.length === 0) return 0;
  const rows = await prisma.productionDetail.findMany({
    where: { id: { in: detailIds } },
    select: { lineTotalRub: true },
  });
  return rows.reduce((s, r) => s + (r.lineTotalRub ?? 0), 0);
}

const lineInclude = {
  productionDetail: {
    select: {
      id: true,
      name: true,
      lineTotalRub: true,
      sourceWorkTypeId: true,
      sourceMaterialId: true,
    },
  },
  overrideWorkType: { select: { id: true, name: true, shortLabel: true } },
  overrideColor: { select: { id: true, name: true, ralCode: true, hex: true } },
} as const;

/** Для GET списка: достаточно данных, чтобы показать в таблице виды работ и цвета по строкам состава. */
const listLineInclude = {
  productionDetail: {
    select: {
      id: true,
      name: true,
      lineTotalRub: true,
      sourceWorkTypeId: true,
      sourceMaterialId: true,
      sourceWorkType: { select: { name: true, shortLabel: true } },
      sourceMaterial: {
        select: {
          characteristic: {
            select: {
              color: { select: { name: true, ralCode: true } },
            },
          },
        },
      },
    },
  },
  overrideWorkType: { select: { id: true, name: true, shortLabel: true } },
  overrideColor: { select: { id: true, name: true, ralCode: true, hex: true } },
} as const;

type ListLineRow = {
  sortOrder: number;
  productionDetail: {
    name: string;
    sourceWorkType: { name: string; shortLabel: string } | null;
    sourceMaterial: {
      characteristic: { color: { name: string; ralCode: string | null } | null } | null;
    } | null;
  };
  overrideWorkType: { name: string; shortLabel: string } | null;
  overrideColor: { name: string; ralCode: string | null } | null;
};

function effectiveWorkTypeLabelForListLine(line: ListLineRow): string {
  if (line.overrideWorkType) {
    return line.overrideWorkType.shortLabel?.trim() || line.overrideWorkType.name;
  }
  const st = line.productionDetail.sourceWorkType;
  if (st) return st.shortLabel?.trim() || st.name;
  return "—";
}

function effectiveColorLabelForListLine(line: ListLineRow): string {
  if (line.overrideColor) {
    const c = line.overrideColor;
    return c.ralCode ? `${c.name} (${c.ralCode})` : c.name;
  }
  const color = line.productionDetail.sourceMaterial?.characteristic?.color;
  if (color) {
    return color.ralCode ? `${color.name} (${color.ralCode})` : color.name;
  }
  return "—";
}

/** Убирает подряд одинаковые значения в сводке таблицы («Серебристый; Серебристый» → «Серебристый»). */
function uniqueSemicolonSummary(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const t = raw.trim();
    if (!t || t === "—") continue;
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.length ? out.join("; ") : "—";
}

productsRouter.get("/", async (_req, res, next) => {
  try {
    const list = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: listLineInclude,
        },
      },
    });
    res.json(
      list.map((p) => {
        const lines = [...p.lines].sort((a, b) => a.sortOrder - b.sortOrder);
        const asRows = lines as unknown as ListLineRow[];
        const detailNamesSummary = uniqueSemicolonSummary(asRows.map((l) => l.productionDetail.name));
        const workTypesSummary = uniqueSemicolonSummary(asRows.map(effectiveWorkTypeLabelForListLine));
        /** Один столбец «Цвет»: сводка по строкам состава без дублей. */
        const colorLabel = uniqueSemicolonSummary(asRows.map(effectiveColorLabelForListLine));
        const compositionLines = asRows.map((l) => ({
          detailName: l.productionDetail.name,
          workTypeLabel: effectiveWorkTypeLabelForListLine(l),
          colorLabel: effectiveColorLabelForListLine(l),
        }));
        return {
          id: p.id,
          name: p.name,
          priceRub: p.priceRub,
          costRub: p.costRub,
          notes: p.notes,
          isActive: p.isActive,
          linesCount: lines.length,
          detailNamesSummary,
          workTypesSummary,
          colorLabel,
          compositionLines,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
    );
  } catch (e) {
    next(e);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.product.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: lineInclude,
        },
      },
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapProduct(row));
  } catch (e) {
    next(e);
  }
});

function mapProduct(row: {
  id: string;
  name: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    sortOrder: number;
    productionDetailId: string;
    workTypeId: string | null;
    colorId: string | null;
    productionDetail: {
      id: string;
      name: string;
      lineTotalRub: number | null;
      sourceWorkTypeId: string | null;
      sourceMaterialId: string | null;
    };
    overrideWorkType: { id: string; name: string; shortLabel: string } | null;
    overrideColor: { id: string; name: string; ralCode: string | null; hex: string } | null;
  }>;
}) {
  return {
    id: row.id,
    name: row.name,
    priceRub: row.priceRub,
    costRub: row.costRub,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lines: row.lines.map((l) => ({
      id: l.id,
      sortOrder: l.sortOrder,
      productionDetailId: l.productionDetailId,
      workTypeId: l.workTypeId,
      colorId: l.colorId,
      productionDetail: l.productionDetail,
      overrideWorkType: l.overrideWorkType,
      overrideColor: l.overrideColor,
    })),
  };
}

productsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const detailIds = p.lines.map((l) => l.productionDetailId);
    const defaultSum = await sumLineTotalsForDetailIds(detailIds);
    const priceRub = numOrNull(p.priceRub) ?? defaultSum;
    const costRub = numOrNull(p.costRub) ?? defaultSum;

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: p.name.trim(),
          priceRub,
          costRub,
          notes: strOrNull(p.notes),
          isActive: p.isActive,
          lines: {
            create: p.lines.map((line, idx) => ({
              sortOrder: line.sortOrder ?? idx,
              productionDetailId: line.productionDetailId,
              workTypeId: strOrNull(line.workTypeId),
              colorId: strOrNull(line.colorId),
            })),
          },
        },
        include: {
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
      return product;
    });

    res.status(201).json(mapProduct(created));
  } catch (e) {
    next(e);
  }
});

productsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const detailIds = p.lines.map((l) => l.productionDetailId);
    const defaultSum = await sumLineTotalsForDetailIds(detailIds);
    const priceRub = numOrNull(p.priceRub) ?? defaultSum;
    const costRub = numOrNull(p.costRub) ?? defaultSum;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.productLine.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          name: p.name.trim(),
          priceRub,
          costRub,
          notes: strOrNull(p.notes),
          isActive: p.isActive,
          lines: {
            create: p.lines.map((line, idx) => ({
              sortOrder: line.sortOrder ?? idx,
              productionDetailId: line.productionDetailId,
              workTypeId: strOrNull(line.workTypeId),
              colorId: strOrNull(line.colorId),
            })),
          },
        },
        include: {
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
    });

    res.json(mapProduct(updated));
  } catch (e) {
    next(e);
  }
});

productsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
