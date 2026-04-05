import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { mapCatalogArticleToJson } from "../lib/catalog-suite.dto.js";

export const catalogArticlesRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();

const CatalogArticleInputSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1),
  code: nullableString,
  description: nullableString,
  qty: z.number().int().positive(),
  isActive: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function prismaClientCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}

const listInclude = {
  product: { select: { id: true, name: true, complexId: true } },
} as const;

catalogArticlesRouter.get("/", async (req, res, next) => {
  try {
    const productIdRaw = req.query["productId"];
    const productId =
      typeof productIdRaw === "string" && productIdRaw.trim() ? productIdRaw.trim() : undefined;
    const where = productId ? { productId } : {};
    const rows = await prisma.article.findMany({
      where,
      orderBy: [{ productId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: listInclude,
    });
    res.json(rows.map((r) => mapCatalogArticleToJson(r)));
  } catch (e) {
    next(e);
  }
});

catalogArticlesRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.article.findUnique({
      where: { id },
      include: listInclude,
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapCatalogArticleToJson(row));
  } catch (e) {
    next(e);
  }
});

catalogArticlesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = CatalogArticleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const exists = await prisma.product.findUnique({ where: { id: p.productId }, select: { id: true } });
    if (!exists) {
      res.status(400).json({ error: "invalid_product_id" });
      return;
    }
    const row = await prisma.article.create({
      data: {
        productId: p.productId,
        name: p.name.trim(),
        code: strOrNull(p.code),
        description: strOrNull(p.description),
        qty: p.qty,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
      },
      include: listInclude,
    });
    res.status(201).json(mapCatalogArticleToJson(row));
  } catch (e) {
    const code = prismaClientCode(e);
    if (code === "P2002") {
      res.status(409).json({ error: "duplicate", message: "code must be unique within product when set" });
      return;
    }
    next(e);
  }
});

catalogArticlesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = CatalogArticleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const exists = await prisma.product.findUnique({ where: { id: p.productId }, select: { id: true } });
    if (!exists) {
      res.status(400).json({ error: "invalid_product_id" });
      return;
    }
    try {
      const row = await prisma.article.update({
        where: { id },
        data: {
          productId: p.productId,
          name: p.name.trim(),
          code: strOrNull(p.code),
          description: strOrNull(p.description),
          qty: p.qty,
          isActive: p.isActive,
          sortOrder: p.sortOrder,
        },
        include: listInclude,
      });
      res.json(mapCatalogArticleToJson(row));
    } catch (err: unknown) {
      const code = prismaClientCode(err);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (code === "P2002") {
        res.status(409).json({ error: "duplicate", message: "code must be unique within product when set" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

catalogArticlesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      await prisma.article.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      const code = prismaClientCode(err);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
