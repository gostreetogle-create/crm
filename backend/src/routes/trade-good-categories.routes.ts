import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const tradeGoodCategoriesRouter = Router();

const InputSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean(),
});

tradeGoodCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.tradeGoodCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
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

tradeGoodCategoriesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const row = await prisma.tradeGoodCategory.create({
      data: {
        name: p.name,
        sortOrder: p.sortOrder ?? 0,
        isActive: p.isActive,
      },
    });
    res.status(201).json({
      id: row.id,
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

tradeGoodCategoriesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    try {
      const row = await prisma.tradeGoodCategory.update({
        where: { id },
        data: {
          name: p.name,
          sortOrder: p.sortOrder ?? 0,
          isActive: p.isActive,
        },
      });
      res.json({
        id: row.id,
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

tradeGoodCategoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.tradeGoodCategory.delete({ where: { id } });
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
