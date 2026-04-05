import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const tradeGoodsRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();
const nullableNumber = z.union([z.number(), z.null(), z.undefined()]).optional();

const LineInputSchema = z.object({
  id: nullableString,
  sortOrder: z.number().int().optional(),
  productId: z.string().min(1),
  qty: z.number().positive().optional(),
});

const InputSchema = z.object({
  code: nullableString,
  name: z.string().trim().min(1),
  description: nullableString,
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

async function sumPriceAndCostFromProducts(
  lines: { productId: string; qty: number }[],
): Promise<{ price: number; cost: number }> {
  if (lines.length === 0) return { price: 0, cost: 0 };
  const ids = [...new Set(lines.map((l) => l.productId))];
  const rows = await prisma.manufacturedProduct.findMany({
    where: { id: { in: ids } },
    select: { id: true, priceRub: true, costRub: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  let price = 0;
  let cost = 0;
  for (const l of lines) {
    const p = byId.get(l.productId);
    const q = l.qty;
    price += (p?.priceRub ?? 0) * q;
    cost += (p?.costRub ?? 0) * q;
  }
  return { price, cost };
}

const listLineInclude = {
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      priceRub: true,
      costRub: true,
    },
  },
} as const;

const lineInclude = listLineInclude;

tradeGoodsRouter.get("/", async (_req, res, next) => {
  try {
    const list = await prisma.tradeGood.findMany({
      orderBy: { name: "asc" },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: listLineInclude,
        },
      },
    });
    res.json(
      list.map((g) => {
        const lines = [...g.lines].sort((a, b) => a.sortOrder - b.sortOrder);
        const productLabels = lines.map((l) => {
          const code = l.product.code?.trim();
          const q = l.qty;
          const base = code ? `${code} — ${l.product.name}` : l.product.name;
          return q !== 1 ? `${base} ×${q}` : base;
        });
        const productsSummary = productLabels.length ? productLabels.join("; ") : "—";
        return {
          id: g.id,
          code: g.code,
          name: g.name,
          description: g.description,
          priceRub: g.priceRub,
          costRub: g.costRub,
          notes: g.notes,
          isActive: g.isActive,
          linesCount: lines.length,
          productsSummary,
          compositionLines: lines.map((l) => ({
            productLabel: l.product.code?.trim()
              ? `${l.product.code.trim()} — ${l.product.name}`
              : l.product.name,
            qty: l.qty,
          })),
          createdAt: g.createdAt.toISOString(),
          updatedAt: g.updatedAt.toISOString(),
        };
      }),
    );
  } catch (e) {
    next(e);
  }
});

tradeGoodsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.tradeGood.findUnique({
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
    res.json(mapTradeGood(row));
  } catch (e) {
    next(e);
  }
});

function mapTradeGood(row: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    sortOrder: number;
    productId: string;
    qty: number;
    product: { id: string; code: string | null; name: string; priceRub: number | null; costRub: number | null };
  }>;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    priceRub: row.priceRub,
    costRub: row.costRub,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lines: row.lines.map((l) => ({
      id: l.id,
      sortOrder: l.sortOrder,
      productId: l.productId,
      qty: l.qty,
      product: l.product,
    })),
  };
}

tradeGoodsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const normLines = p.lines.map((l, idx) => ({
      productId: l.productId,
      sortOrder: l.sortOrder ?? idx,
      qty: l.qty ?? 1,
    }));
    const sums = await sumPriceAndCostFromProducts(normLines);
    const priceRub = numOrNull(p.priceRub) ?? sums.price;
    const costRub = numOrNull(p.costRub) ?? sums.cost;

    const created = await prisma.$transaction(async (tx) => {
      const tg = await tx.tradeGood.create({
        data: {
          code: strOrNull(p.code),
          name: p.name.trim(),
          description: strOrNull(p.description),
          priceRub,
          costRub,
          notes: strOrNull(p.notes),
          isActive: p.isActive,
          lines: {
            create: normLines.map((line) => ({
              sortOrder: line.sortOrder,
              productId: line.productId,
              qty: line.qty,
            })),
          },
        },
        include: {
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
      return tg;
    });

    res.status(201).json(mapTradeGood(created));
  } catch (e) {
    next(e);
  }
});

tradeGoodsRouter.put("/:id", async (req, res, next) => {
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
    const normLines = p.lines.map((l, idx) => ({
      productId: l.productId,
      sortOrder: l.sortOrder ?? idx,
      qty: l.qty ?? 1,
    }));
    const sums = await sumPriceAndCostFromProducts(normLines);
    const priceRub = numOrNull(p.priceRub) ?? sums.price;
    const costRub = numOrNull(p.costRub) ?? sums.cost;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.tradeGoodLine.deleteMany({ where: { tradeGoodId: id } });
      return tx.tradeGood.update({
        where: { id },
        data: {
          code: strOrNull(p.code),
          name: p.name.trim(),
          description: strOrNull(p.description),
          priceRub,
          costRub,
          notes: strOrNull(p.notes),
          isActive: p.isActive,
          lines: {
            create: normLines.map((line) => ({
              sortOrder: line.sortOrder,
              productId: line.productId,
              qty: line.qty,
            })),
          },
        },
        include: {
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
    });

    res.json(mapTradeGood(updated));
  } catch (e) {
    next(e);
  }
});

tradeGoodsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    await prisma.tradeGood.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
