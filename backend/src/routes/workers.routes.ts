import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const workersRouter = Router();

const CreateBodySchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().optional(),
});

const UpdateBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    role: z.union([z.string(), z.null()]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

workersRouter.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.worker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json(rows);
  } catch (e) {
    req.log?.error({ route: "GET /workers", err: String(e) });
    next(e);
  }
});

workersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = CreateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      req.log?.warn({ route: "POST /workers", reason: "invalid_body", details: parsed.error.flatten() });
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const { name, role } = parsed.data;
    const roleNorm = role != null && role.trim() !== "" ? role.trim() : null;
    const row = await prisma.worker.create({
      data: { name: name.trim(), role: roleNorm },
    });
    req.log?.info({ route: "POST /workers", workerId: row.id });
    res.status(200).json(row);
  } catch (e) {
    req.log?.error({ route: "POST /workers", err: String(e) });
    next(e);
  }
});

workersRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = UpdateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      req.log?.warn({ route: "PUT /workers/:id", reason: "invalid_body", details: parsed.error.flatten() });
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const data: { name?: string; role?: string | null; isActive?: boolean } = {};
    if (p.name !== undefined) data.name = p.name;
    if (p.role !== undefined) data.role = p.role != null && p.role.trim() !== "" ? p.role.trim() : null;
    if (p.isActive !== undefined) data.isActive = p.isActive;
    if (Object.keys(data).length === 0) {
      req.log?.warn({ route: "PUT /workers/:id", reason: "empty_body" });
      res.status(400).json({ error: "invalid_body", message: "no fields to update" });
      return;
    }
    try {
      const row = await prisma.worker.update({
        where: { id },
        data,
      });
      req.log?.info({ route: "PUT /workers/:id", workerId: id });
      res.status(200).json(row);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2025") {
          req.log?.warn({ route: "PUT /workers/:id", workerId: id, reason: "not_found" });
          res.status(404).json({ error: "not_found" });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    req.log?.error({ route: "PUT /workers/:id", err: String(e) });
    next(e);
  }
});

workersRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      const row = await prisma.worker.update({
        where: { id },
        data: { isActive: false },
      });
      req.log?.info({ route: "DELETE /workers/:id", workerId: id });
      res.status(200).json(row);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2025") {
          req.log?.warn({ route: "DELETE /workers/:id", workerId: id, reason: "not_found" });
          res.status(404).json({ error: "not_found" });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    req.log?.error({ route: "DELETE /workers/:id", err: String(e) });
    next(e);
  }
});
