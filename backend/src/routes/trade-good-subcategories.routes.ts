import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const tradeGoodSubcategoriesRouter = Router();

const InputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean(),
});

tradeGoodSubcategoriesRouter.get("/", async (req, res, next) => {
  try {
    const categoryIdRaw = req.query["categoryId"];
    const categoryId =
      typeof categoryIdRaw === "string" && categoryIdRaw.trim().length ? categoryIdRaw.trim() : undefined;
    const rows = await prisma.tradeGoodSubcategory.findMany({
      where: categoryId ? { categoryId } : {},
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        categoryName: r.category.name,
        name: r.name,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  } catch (e) {
    next(e);
  }
});

tradeGoodSubcategoriesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const cat = await prisma.tradeGoodCategory.findUnique({ where: { id: p.categoryId } });
    if (!cat) {
      res.status(400).json({ error: "category_not_found" });
      return;
    }
    const row = await prisma.tradeGoodSubcategory.create({
      data: {
        categoryId: p.categoryId,
        name: p.name,
        sortOrder: p.sortOrder ?? 0,
        isActive: p.isActive,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    res.status(201).json({
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      name: row.name,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

tradeGoodSubcategoriesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const cat = await prisma.tradeGoodCategory.findUnique({ where: { id: p.categoryId } });
    if (!cat) {
      res.status(400).json({ error: "category_not_found" });
      return;
    }
    try {
      const row = await prisma.tradeGoodSubcategory.update({
        where: { id },
        data: {
          categoryId: p.categoryId,
          name: p.name,
          sortOrder: p.sortOrder ?? 0,
          isActive: p.isActive,
        },
        include: { category: { select: { id: true, name: true } } },
      });
      res.json({
        id: row.id,
        categoryId: row.categoryId,
        categoryName: row.category.name,
        name: row.name,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
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

tradeGoodSubcategoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.tradeGoodSubcategory.delete({ where: { id } });
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
