import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const ordersRouter = Router();

const OrderStatusSchema = z.enum(["NEW", "CONFIRMED", "IN_PROGRESS", "DONE", "SHIPPED"]);
const BaseItemSchema = z.object({
  warehouseProductId: z.string().optional().nullable(),
  name: z.string().trim().min(1),
  sku: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).default("шт."),
});
const CreateOrderSchema = z.object({
  quoteId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  items: z.array(BaseItemSchema.extend({ price: z.number().nonnegative().default(0) })).optional().default([]),
});
const PatchOrderSchema = z.object({
  status: OrderStatusSchema.optional(),
  comment: z.string().optional().nullable(),
});
const CreateItemSchema = BaseItemSchema.extend({ price: z.number().nonnegative().default(0) });
const PatchItemSchema = CreateItemSchema.partial();
const CreateBomSchema = BaseItemSchema;
const PatchBomSchema = BaseItemSchema.partial();

function cleanString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

async function nextOrderNumber(): Promise<string> {
  const rows = await prisma.order.findMany({
    where: { number: { startsWith: "ORD-" } },
    select: { number: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  let max = 0;
  for (const row of rows) {
    const m = /^ORD-(\d+)$/.exec(String(row.number ?? "").trim());
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `ORD-${String(max + 1).padStart(6, "0")}`;
}

ordersRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query["status"] === "string" ? req.query["status"] : "";
    const search = typeof req.query["search"] === "string" ? req.query["search"].trim() : "";
    const quoteId = typeof req.query["quoteId"] === "string" ? req.query["quoteId"].trim() : "";
    const rows = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as z.infer<typeof OrderStatusSchema> } : {}),
        ...(quoteId ? { quoteId } : {}),
        ...(search
          ? {
              OR: [
                { number: { contains: search, mode: "insensitive" } },
                { customerLabel: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      rows.map((row) => ({
        id: row.id,
        number: row.number,
        quoteId: row.quoteId,
        clientId: row.clientId,
        status: row.status,
        comment: row.comment,
        itemsCount: row.items.length,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    next(e);
  }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { bomItems: true } } },
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const number = await nextOrderNumber();
    const row = await prisma.order.create({
      data: {
        number,
        quoteId: cleanString(p.quoteId),
        clientId: cleanString(p.clientId),
        comment: cleanString(p.comment),
        orderNumber: number,
        items: {
          create: p.items.map((item) => ({
            warehouseProductId: cleanString(item.warehouseProductId),
            name: item.name.trim(),
            sku: cleanString(item.sku),
            quantity: item.quantity,
            unit: item.unit.trim(),
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.patch("/:id", async (req, res, next) => {
  try {
    const parsed = PatchOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.comment !== undefined ? { comment: cleanString(parsed.data.comment) } : {}),
      },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.delete("/:id", async (req, res, next) => {
  try {
    const row = await prisma.order.findUnique({ where: { id: req.params.id }, select: { status: true } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (row.status !== "NEW") {
      res.status(409).json({ error: "only_new_can_be_deleted" });
      return;
    }
    await prisma.order.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/items", async (req, res, next) => {
  try {
    const parsed = CreateItemSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    const row = await prisma.orderItem.create({
      data: {
        orderId: req.params.id,
        warehouseProductId: cleanString(parsed.data.warehouseProductId),
        name: parsed.data.name.trim(),
        sku: cleanString(parsed.data.sku),
        quantity: parsed.data.quantity,
        unit: parsed.data.unit.trim(),
        price: parsed.data.price,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.patch("/:id/items/:itemId", async (req, res, next) => {
  try {
    const parsed = PatchItemSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    const row = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(parsed.data.warehouseProductId !== undefined
          ? { warehouseProductId: cleanString(parsed.data.warehouseProductId) }
          : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.sku !== undefined ? { sku: cleanString(parsed.data.sku) } : {}),
        ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
        ...(parsed.data.unit !== undefined ? { unit: parsed.data.unit.trim() } : {}),
        ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
      },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    await prisma.orderItem.delete({ where: { id: req.params.itemId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/items/:itemId/bom", async (req, res, next) => {
  try {
    const parsed = CreateBomSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    const row = await prisma.bomItem.create({
      data: {
        orderItemId: req.params.itemId,
        warehouseProductId: cleanString(parsed.data.warehouseProductId),
        name: parsed.data.name.trim(),
        sku: cleanString(parsed.data.sku),
        quantity: parsed.data.quantity,
        unit: parsed.data.unit.trim(),
      },
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.patch("/:id/items/:itemId/bom/:bomId", async (req, res, next) => {
  try {
    const parsed = PatchBomSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    const row = await prisma.bomItem.update({
      where: { id: req.params.bomId },
      data: {
        ...(parsed.data.warehouseProductId !== undefined
          ? { warehouseProductId: cleanString(parsed.data.warehouseProductId) }
          : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.sku !== undefined ? { sku: cleanString(parsed.data.sku) } : {}),
        ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
        ...(parsed.data.unit !== undefined ? { unit: parsed.data.unit.trim() } : {}),
      },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

ordersRouter.delete("/:id/items/:itemId/bom/:bomId", async (req, res, next) => {
  try {
    await prisma.bomItem.delete({ where: { id: req.params.bomId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/send-to-supply", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { bomItems: true } },
      },
    });
    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const needByProduct = new Map<string, { qty: number; unit: string; name: string; sku: string | null }>();
    let skipped = 0;
    for (const item of order.items) {
      for (const bom of item.bomItems) {
        if (!bom.warehouseProductId) {
          skipped += 1;
          continue;
        }
        const key = bom.warehouseProductId;
        const requiredQty = bom.quantity * item.quantity;
        const current = needByProduct.get(key);
        if (current) {
          current.qty += requiredQty;
        } else {
          needByProduct.set(key, {
            qty: requiredQty,
            unit: bom.unit,
            name: bom.name,
            sku: bom.sku ?? null,
          });
        }
      }
    }

    let created = 0;
    if (needByProduct.size > 0) {
      const request = await prisma.supplyRequest.upsert({
        where: { orderId: order.id },
        update: {},
        create: { orderId: order.id },
      });
      for (const [warehouseProductId, required] of needByProduct.entries()) {
        const stock = await prisma.warehouseProduct.findUnique({
          where: { id: warehouseProductId },
          select: { quantity: true },
        });
        const available = stock?.quantity ?? 0;
        if (available >= required.qty) {
          skipped += 1;
          continue;
        }
        const deficit = required.qty - available;
        await prisma.supplyRequestItem.create({
          data: {
            supplyRequestId: request.id,
            productName: required.name,
            sku: required.sku,
            qty: deficit,
            unit: required.unit,
            warehouseProductId,
          },
        });
        created += 1;
      }
    }

    res.json({ created, skipped });
  } catch (e) {
    next(e);
  }
});

