import { Router } from "express";
import { z } from "zod";
import type * as Prisma from "@prisma/client";
import type { ProductionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const productionRouter = Router();

const ProductionStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE"]);
const ProductionLineStatusSchema = z.enum(["DESIGNING", "IN_PROGRESS", "DONE"]);

function parseIsoDate(v: string | undefined): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanNotes(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeLineStatus(value: unknown): "DESIGNING" | "IN_PROGRESS" | "DONE" {
  if (value === "IN_PROGRESS" || value === "DONE" || value === "DESIGNING") return value;
  return "DESIGNING";
}

function normalizeLinesSnapshot(linesSnapshot: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(linesSnapshot)) return [];
  return linesSnapshot.map((line) => {
    const row = typeof line === "object" && line !== null ? { ...(line as Record<string, unknown>) } : {};
    row.status = normalizeLineStatus(row.status);
    return row;
  });
}

function withNormalizedLines<T extends { linesSnapshot: unknown }>(row: T): T & { linesSnapshot: Array<Record<string, unknown>> } {
  return {
    ...row,
    linesSnapshot: normalizeLinesSnapshot(row.linesSnapshot),
  };
}

const OrderStatusBodySchema = z.object({
  status: ProductionStatusSchema,
});

const AssignBodySchema = z.object({
  workerId: z.string().trim().min(1),
  lineNo: z.number().int().positive(),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

const AssignmentUpdateBodySchema = z
  .object({
    workerId: z.union([z.string(), z.null(), z.undefined()]).optional(),
    status: ProductionStatusSchema.optional(),
    startDate: z.union([z.string(), z.null(), z.undefined()]).optional(),
    endDate: z.union([z.string(), z.null(), z.undefined()]).optional(),
    notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  })
  .strict();

const LineStatusBodySchema = z.object({
  status: ProductionLineStatusSchema,
});

productionRouter.get("/orders", async (req, res, next) => {
  try {
    const rows = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: { worker: true },
        },
      },
    });
    res.json(rows.map((row) => withNormalizedLines(row)));
  } catch (e) {
    req.log?.error({ route: "GET /production/orders", err: String(e) });
    next(e);
  }
});

productionRouter.get("/orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.order.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { worker: true },
        },
      },
    });
    if (!row) {
      req.log?.warn({ route: "GET /production/orders/:id", orderId: id, reason: "not_found" });
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(withNormalizedLines(row));
  } catch (e) {
    req.log?.error({ route: "GET /production/orders/:id", err: String(e) });
    next(e);
  }
});

productionRouter.put("/orders/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = OrderStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      req.log?.warn({
        route: "PUT /production/orders/:id/status",
        reason: "invalid_body",
        details: parsed.error.flatten(),
      });
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const status = parsed.data.status as ProductionStatus;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      req.log?.warn({ route: "PUT /production/orders/:id/status", orderId: id, reason: "not_found" });
      res.status(404).json({ error: "not_found" });
      return;
    }
    const data: {
      productionStatus: ProductionStatus;
      productionStart?: Date;
    } = { productionStatus: status };
    if (status === "IN_PROGRESS" && existing.productionStart == null) {
      data.productionStart = new Date();
    }
    const row = await prisma.order.update({
      where: { id },
      data,
      include: {
        assignments: { include: { worker: true } },
      },
    });
    req.log?.info({ route: "PUT /production/orders/:id/status", orderId: id, status });
    res.json(row);
  } catch (e) {
    req.log?.error({ route: "PUT /production/orders/:id/status", err: String(e) });
    next(e);
  }
});

productionRouter.put("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { deadline, productionStart, notes } = req.body as {
    deadline?: string | null;
    productionStart?: string | null;
    notes?: string | null;
  };
  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(deadline !== undefined && {
          deadline: deadline ? new Date(deadline) : null,
        }),
        ...(productionStart !== undefined && {
          productionStart: productionStart ? new Date(productionStart) : null,
        }),
        ...(notes !== undefined && {
          notes: cleanNotes(notes),
        }),
      },
    });
    res.json(updated);
  } catch (e) {
    req.log?.error({ route: "PUT /production/orders/:id", err: String(e) });
    res.status(500).json({ error: "Ошибка обновления заказа" });
  }
});

productionRouter.patch("/orders/:id/lines/:lineNo/status", async (req, res, next) => {
  try {
    const { id, lineNo } = req.params;
    if (!id || !lineNo) {
      res.status(400).json({ error: "missing_params" });
      return;
    }
    const parsedLineNo = Number.parseInt(lineNo, 10);
    if (!Number.isFinite(parsedLineNo) || parsedLineNo <= 0) {
      res.status(400).json({ error: "invalid_line_no" });
      return;
    }
    const parsed = LineStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const lines = normalizeLinesSnapshot(order.linesSnapshot);
    const idx = lines.findIndex((line) => Number(line.lineNo) === parsedLineNo);
    if (idx < 0) {
      res.status(404).json({ error: "line_not_found" });
      return;
    }
    lines[idx] = { ...lines[idx], status: parsed.data.status };

    const updated = await prisma.order.update({
      where: { id },
      data: { linesSnapshot: lines as unknown as Prisma.JsonArray },
      include: {
        assignments: { include: { worker: true } },
      },
    });
    res.json(withNormalizedLines(updated));
  } catch (e) {
    req.log?.error({ route: "PATCH /production/orders/:id/lines/:lineNo/status", err: String(e) });
    next(e);
  }
});

productionRouter.post("/orders/:id/assign", async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = AssignBodySchema.safeParse(req.body);
    if (!parsed.success) {
      req.log?.warn({
        route: "POST /production/orders/:id/assign",
        reason: "invalid_body",
        details: parsed.error.flatten(),
      });
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const startDate = parseIsoDate(p.startDate);
    const endDate = parseIsoDate(p.endDate);
    if (!startDate || !endDate) {
      req.log?.warn({ route: "POST /production/orders/:id/assign", reason: "invalid_dates" });
      res.status(400).json({ error: "invalid_body", message: "startDate and endDate must be valid ISO dates" });
      return;
    }
    if (endDate.getTime() < startDate.getTime()) {
      req.log?.warn({ route: "POST /production/orders/:id/assign", reason: "end_before_start" });
      res.status(400).json({ error: "invalid_body", message: "endDate must be >= startDate" });
      return;
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      req.log?.warn({ route: "POST /production/orders/:id/assign", orderId, reason: "order_not_found" });
      res.status(404).json({ error: "not_found" });
      return;
    }
    try {
      const row = await prisma.workerAssignment.create({
        data: {
          orderId,
          workerId: p.workerId,
          lineNo: p.lineNo,
          startDate,
          endDate,
          notes: cleanNotes(p.notes ?? null),
        },
        include: { worker: true, order: true },
      });
      req.log?.info({
        route: "POST /production/orders/:id/assign",
        orderId,
        assignmentId: row.id,
      });
      res.status(201).json(row);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2002") {
          req.log?.warn({
            route: "POST /production/orders/:id/assign",
            orderId,
            reason: "unique_conflict",
          });
          res.status(409).json({
            error: "assignment_conflict",
            message: "Назначение с таким orderId, workerId и lineNo уже существует.",
          });
          return;
        }
        if (code === "P2003") {
          req.log?.warn({ route: "POST /production/orders/:id/assign", reason: "foreign_key" });
          res.status(400).json({ error: "invalid_ref", message: "workerId или orderId не найден." });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    req.log?.error({ route: "POST /production/orders/:id/assign", err: String(e) });
    next(e);
  }
});

productionRouter.put("/assignments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = AssignmentUpdateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      req.log?.warn({
        route: "PUT /production/assignments/:id",
        reason: "invalid_body",
        details: parsed.error.flatten(),
      });
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const b = parsed.data;
    const data: {
      workerId?: string;
      status?: ProductionStatus;
      startDate?: Date;
      endDate?: Date;
      notes?: string | null;
    } = {};
    if (b.workerId !== undefined) {
      const workerId = String(b.workerId ?? "").trim();
      if (!workerId) {
        res.status(400).json({ error: "invalid_body", message: "workerId cannot be empty" });
        return;
      }
      data.workerId = workerId;
    }
    if (b.status !== undefined) data.status = b.status as ProductionStatus;
    if (b.startDate !== undefined) {
      if (b.startDate === null) {
        req.log?.warn({ route: "PUT /production/assignments/:id", reason: "null_startDate" });
        res.status(400).json({ error: "invalid_body", message: "startDate cannot be null" });
        return;
      }
      const d = parseIsoDate(b.startDate);
      if (!d) {
        res.status(400).json({ error: "invalid_body", message: "invalid startDate" });
        return;
      }
      data.startDate = d;
    }
    if (b.endDate !== undefined) {
      if (b.endDate === null) {
        req.log?.warn({ route: "PUT /production/assignments/:id", reason: "null_endDate" });
        res.status(400).json({ error: "invalid_body", message: "endDate cannot be null" });
        return;
      }
      const d = parseIsoDate(b.endDate);
      if (!d) {
        res.status(400).json({ error: "invalid_body", message: "invalid endDate" });
        return;
      }
      data.endDate = d;
    }
    if (b.notes !== undefined) data.notes = cleanNotes(b.notes);
    if (Object.keys(data).length === 0) {
      req.log?.warn({ route: "PUT /production/assignments/:id", reason: "empty_body" });
      res.status(400).json({ error: "invalid_body", message: "no fields to update" });
      return;
    }
    try {
      const row = await prisma.workerAssignment.update({
        where: { id },
        data,
        include: { worker: true, order: true },
      });
      req.log?.info({ route: "PUT /production/assignments/:id", assignmentId: id });
      res.json(row);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2025") {
          req.log?.warn({ route: "PUT /production/assignments/:id", assignmentId: id, reason: "not_found" });
          res.status(404).json({ error: "not_found" });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    req.log?.error({ route: "PUT /production/assignments/:id", err: String(e) });
    next(e);
  }
});

productionRouter.delete("/assignments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      await prisma.workerAssignment.delete({ where: { id } });
      req.log?.info({ route: "DELETE /production/assignments/:id", assignmentId: id });
      res.status(204).send();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2025") {
          req.log?.warn({ route: "DELETE /production/assignments/:id", assignmentId: id, reason: "not_found" });
          res.status(404).json({ error: "not_found" });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    req.log?.error({ route: "DELETE /production/assignments/:id", err: String(e) });
    next(e);
  }
});
