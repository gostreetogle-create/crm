import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { mapCatalogProductToJson } from "../lib/catalog-suite.dto.js";

export const catalogProductsRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();

const CatalogProductInputSchema = z.object({
  complexId: z.string().min(1),
  name: z.string().trim().min(1),
  code: nullableString,
  description: nullableString,
  price: z.number().finite().nonnegative(),
  isActive: z.boolean(),
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

const listInclude = { complex: { select: { id: true, name: true } } } as const;

catalogProductsRouter.get("/", async (req, res, next) => {
  try {
    const complexIdRaw = req.query["complexId"];
    const complexId =
      typeof complexIdRaw === "string" && complexIdRaw.trim() ? complexIdRaw.trim() : undefined;
    const where = complexId ? { complexId } : {};
    const rows = await prisma.product.findMany({
      where,
      orderBy: [{ complexId: "asc" }, { name: "asc" }],
      include: listInclude,
    });
    res.json(rows.map((r) => mapCatalogProductToJson(r)));
  } catch (e) {
    next(e);
  }
});

catalogProductsRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.product.findUnique({
      where: { id },
      include: listInclude,
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapCatalogProductToJson(row));
  } catch (e) {
    next(e);
  }
});

catalogProductsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = CatalogProductInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const exists = await prisma.complex.findUnique({ where: { id: p.complexId }, select: { id: true } });
    if (!exists) {
      res.status(400).json({ error: "invalid_complex_id" });
      return;
    }
    const row = await prisma.product.create({
      data: {
        complexId: p.complexId,
        name: p.name.trim(),
        code: strOrNull(p.code),
        description: strOrNull(p.description),
        price: new Prisma.Decimal(p.price),
        isActive: p.isActive,
      },
      include: listInclude,
    });
    res.status(201).json(mapCatalogProductToJson(row));
  } catch (e) {
    const code = prismaClientCode(e);
    if (code === "P2002") {
      res.status(409).json({ error: "duplicate", message: "code must be unique within complex when set" });
      return;
    }
    next(e);
  }
});

catalogProductsRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = CatalogProductInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const exists = await prisma.complex.findUnique({ where: { id: p.complexId }, select: { id: true } });
    if (!exists) {
      res.status(400).json({ error: "invalid_complex_id" });
      return;
    }
    try {
      const row = await prisma.product.update({
        where: { id },
        data: {
          complexId: p.complexId,
          name: p.name.trim(),
          code: strOrNull(p.code),
          description: strOrNull(p.description),
          price: new Prisma.Decimal(p.price),
          isActive: p.isActive,
        },
        include: listInclude,
      });
      res.json(mapCatalogProductToJson(row));
    } catch (err: unknown) {
      const code = prismaClientCode(err);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (code === "P2002") {
        res.status(409).json({ error: "duplicate", message: "code must be unique within complex when set" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

catalogProductsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      await prisma.product.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      const code = prismaClientCode(err);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (code === "P2003") {
        res.status(409).json({ error: "in_use", message: "product has catalog articles" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
