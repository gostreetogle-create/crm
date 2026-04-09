import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const ordersRouter = Router();

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();
const nullableIsoDate = z.union([z.string(), z.null(), z.undefined()]).optional();

const LineSnapshotSchema = z.object({
  lineNo: z.number().int().positive(),
  name: z.string().trim().min(1),
  description: nullableString,
  qty: z.number().positive(),
  unit: z.string().trim().min(1),
  sortOrder: z.number().int().nonnegative().optional(),
});

const InputSchema = z.object({
  commercialOfferId: z.string().uuid(),
  orderNumber: z.string().trim().min(1),
  offerNumber: nullableString,
  customerLabel: z.string().trim().min(1),
  deadline: nullableIsoDate,
  notes: nullableString,
  linesSnapshot: z.array(LineSnapshotSchema),
});

const UpdateSchema = z.object({
  orderNumber: z.string().trim().min(1).optional(),
  deadline: nullableIsoDate,
  notes: nullableString,
});

function cleanString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseDateOrNull(v: string | null | undefined): Date | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function mapOrder(row: {
  id: string;
  commercialOfferId: string;
  orderNumber: string;
  offerNumber: string;
  customerLabel: string;
  deadline: Date | null;
  notes: string | null;
  linesSnapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    commercialOfferId: row.commercialOfferId,
    orderNumber: row.orderNumber,
    offerNumber: row.offerNumber,
    customerLabel: row.customerLabel,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    notes: row.notes ?? "",
    linesSnapshot: Array.isArray(row.linesSnapshot) ? row.linesSnapshot : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

ordersRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
    res.json(rows.map((row) => mapOrder(row)));
  } catch (e) {
    next(e);
  }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.order.findUnique({ where: { id } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapOrder(row));
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const row = await prisma.order.create({
      data: {
        commercialOfferId: p.commercialOfferId,
        orderNumber: p.orderNumber.trim(),
        offerNumber: cleanString(p.offerNumber) ?? "",
        customerLabel: p.customerLabel.trim(),
        deadline: parseDateOrNull(p.deadline),
        notes: cleanString(p.notes),
        linesSnapshot: p.linesSnapshot.map((line, idx) => ({
          lineNo: line.lineNo,
          name: line.name.trim(),
          description: cleanString(line.description),
          qty: line.qty,
          unit: line.unit.trim(),
          sortOrder: line.sortOrder ?? idx,
        })),
      },
    });
    res.status(201).json(mapOrder(row));
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err) {
      const code = String((err as { code: unknown }).code);
      if (code === "P2002") {
        res.status(409).json({
          error: "order_exists_for_offer",
          message: "Для этого КП заказ уже создан.",
        });
        return;
      }
      if (code === "P2003") {
        res.status(409).json({ error: "invalid_offer_ref", message: "Указанный КП не найден." });
        return;
      }
    }
    next(err);
  }
});

ordersRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    try {
      const row = await prisma.order.update({
        where: { id },
        data: {
          ...(p.orderNumber !== undefined
            ? { orderNumber: p.orderNumber.trim() }
            : {}),
          ...(p.deadline !== undefined
            ? { deadline: parseDateOrNull(p.deadline) }
            : {}),
          ...(p.notes !== undefined ? { notes: cleanString(p.notes) } : {}),
        },
      });
      res.json(mapOrder(row));
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2025") {
          res.status(404).json({ error: "not_found" });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

ordersRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      await prisma.order.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = String((err as { code: unknown }).code);
        if (code === "P2025") {
          res.status(404).json({ error: "not_found" });
          return;
        }
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

