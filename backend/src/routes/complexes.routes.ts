import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { mapComplexToJson } from "../lib/catalog-suite.dto.js";

export const complexesRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();

const ComplexInputSchema = z.object({
  name: z.string().trim().min(1),
  code: nullableString,
  description: nullableString,
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

complexesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.complex.findMany({ orderBy: { name: "asc" } });
    res.json(rows.map(mapComplexToJson));
  } catch (e) {
    next(e);
  }
});

complexesRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.complex.findUnique({ where: { id } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapComplexToJson(row));
  } catch (e) {
    next(e);
  }
});

complexesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = ComplexInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const row = await prisma.complex.create({
      data: {
        name: p.name.trim(),
        code: strOrNull(p.code),
        description: strOrNull(p.description),
        isActive: p.isActive,
      },
    });
    res.status(201).json(mapComplexToJson(row));
  } catch (e) {
    const code = prismaClientCode(e);
    if (code === "P2002") {
      res.status(409).json({ error: "duplicate", message: "code must be unique when set" });
      return;
    }
    next(e);
  }
});

complexesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = ComplexInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    try {
      const row = await prisma.complex.update({
        where: { id },
        data: {
          name: p.name.trim(),
          code: strOrNull(p.code),
          description: strOrNull(p.description),
          isActive: p.isActive,
        },
      });
      res.json(mapComplexToJson(row));
    } catch (err: unknown) {
      const code = prismaClientCode(err);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (code === "P2002") {
        res.status(409).json({ error: "duplicate", message: "code must be unique when set" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

complexesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      await prisma.complex.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      const code = prismaClientCode(err);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (code === "P2003") {
        res.status(409).json({ error: "in_use", message: "complex has catalog products" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
