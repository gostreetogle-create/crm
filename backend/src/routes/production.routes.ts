import { Router } from "express";
import { z } from "zod";
import type { Prisma, ProductionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { applyOutgoing, StockInsufficientError } from "../services/warehouse/stock-movement.service.js";
import { getEffectivePermissionKeysForRoleId } from "../lib/authz-effective-keys.js";

export const productionRouter = Router();

const ProductionStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE", "SHIPPED"]);
const ProductionLineStatusSchema = z.enum(["DESIGNING", "IN_PROGRESS", "DONE"]);

type OrderLineSnapshot = {
  lineNo: number;
  name: string;
  qty: number;
  unit: string;
  id?: string;
  catalogProductId?: string | null;
  sku?: string | null;
  materials?: Array<{
    id: string;
    orderItemId: string;
    name: string;
    quantity: number;
    unit: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

type NormalizedShipmentLine = {
  lineNo: number;
  name: string;
  qty: number;
  sku: string | null;
  catalogProductId: string | null;
};

type ResolvedShipmentLine = NormalizedShipmentLine & {
  productId: string;
  productName: string;
  productSku: string;
};

class AlreadyDeductedError extends Error {
  constructor() {
    super("stock_already_deducted");
  }
}

class ProductResolveError extends Error {
  constructor(public readonly line: NormalizedShipmentLine) {
    super("warehouse_product_not_found_for_line");
  }
}

class OrderNotFoundInShipmentError extends Error {
  constructor() {
    super("order_not_found");
  }
}

function normalizeShipmentLines(linesSnapshot: unknown): NormalizedShipmentLine[] {
  if (!Array.isArray(linesSnapshot)) return [];
  return linesSnapshot
    .map((line): NormalizedShipmentLine | null => {
      if (typeof line !== "object" || line == null) return null;
      const row = line as Partial<OrderLineSnapshot>;
      const qty = typeof row.qty === "number" && Number.isFinite(row.qty) ? row.qty : 0;
      if (qty <= 0) return null;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return null;
      const sku = typeof row.sku === "string" && row.sku.trim() ? row.sku.trim() : null;
      const catalogProductId =
        typeof row.catalogProductId === "string" && row.catalogProductId.trim()
          ? row.catalogProductId.trim()
          : null;
      const lineNo = typeof row.lineNo === "number" && Number.isFinite(row.lineNo) ? row.lineNo : 0;
      return { lineNo, name, qty, sku, catalogProductId };
    })
    .filter((line): line is NormalizedShipmentLine => line !== null);
}

async function resolveWarehouseProductForLine(
  tx: Prisma.TransactionClient,
  line: NormalizedShipmentLine,
): Promise<{ id: string; name: string; sku: string } | null> {
  if (line.sku) {
    const bySku = await tx.warehouseProduct.findUnique({
      where: { sku: line.sku },
      select: { id: true, name: true, sku: true },
    });
    if (bySku) return bySku;
  }

  if (line.catalogProductId) {
    const tradeGood = await tx.tradeGood.findUnique({
      where: { id: line.catalogProductId },
      select: { code: true, name: true },
    });
    const tradeGoodCode = tradeGood?.code?.trim();
    if (tradeGoodCode) {
      const byCatalogCode = await tx.warehouseProduct.findUnique({
        where: { sku: tradeGoodCode },
        select: { id: true, name: true, sku: true },
      });
      if (byCatalogCode) return byCatalogCode;
    }
    const tradeGoodName = tradeGood?.name?.trim();
    if (tradeGoodName) {
      const byCatalogName = await tx.warehouseProduct.findFirst({
        where: { name: { equals: tradeGoodName, mode: "insensitive" } },
        select: { id: true, name: true, sku: true },
      });
      if (byCatalogName) return byCatalogName;
    }
  }

  return tx.warehouseProduct.findFirst({
    where: { name: { equals: line.name, mode: "insensitive" } },
    select: { id: true, name: true, sku: true },
  });
}

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

function toLineItemId(line: Record<string, unknown>): string {
  const explicit = typeof line.id === "string" ? line.id.trim() : "";
  if (explicit) return explicit;
  const lineNo = Number(line.lineNo);
  if (Number.isFinite(lineNo)) return String(lineNo);
  return "";
}

function applyLineMaterials(
  linesSnapshot: Array<Record<string, unknown>>,
  materials: Array<{
    id: string;
    orderItemId: string;
    name: string;
    quantity: number;
    unit: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
): Array<Record<string, unknown>> {
  return linesSnapshot.map((line) => {
    const lineNo = Number(line.lineNo);
    const lineItemId = toLineItemId(line);
    const lineMaterials = materials
      .filter((material) => {
        if (lineItemId && material.orderItemId === lineItemId) return true;
        if (!Number.isFinite(lineNo)) return false;
        return material.orderItemId === String(lineNo);
      })
      .map((material) => ({
        id: material.id,
        orderItemId: material.orderItemId,
        name: material.name,
        quantity: material.quantity,
        unit: material.unit,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      }));
    return { ...line, materials: lineMaterials };
  });
}

const OrderStatusBodySchema = z.object({
  status: ProductionStatusSchema,
  force: z.boolean().optional(),
});

const OrderUpdateBodySchema = z
  .object({
    deadline: z.union([z.string(), z.null(), z.undefined()]).optional(),
    productionStart: z.union([z.string(), z.null(), z.undefined()]).optional(),
    notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  })
  .strict();

const OrderPatchBodySchema = z
  .object({
    startDate: z.union([z.string(), z.null(), z.undefined()]).optional(),
    endDate: z.union([z.string(), z.null(), z.undefined()]).optional(),
    productionStart: z.union([z.string(), z.null(), z.undefined()]).optional(),
    deadline: z.union([z.string(), z.null(), z.undefined()]).optional(),
    notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  })
  .strict();

const OrderItemMaterialCreateSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
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

const ORDER_STATUS_TRANSITIONS: Record<ProductionStatus, readonly ProductionStatus[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE"],
  DONE: ["SHIPPED"],
  SHIPPED: [],
};

function canTransitionOrderStatus(current: ProductionStatus, next: ProductionStatus): boolean {
  if (current === next) return true;
  return ORDER_STATUS_TRANSITIONS[current].includes(next);
}

async function canForceOrderStatus(req: { auth?: { roleId: string } }): Promise<boolean> {
  if (!req.auth) return false;
  const keys = await getEffectivePermissionKeysForRoleId(req.auth.roleId);
  return keys.has("production.force_status");
}

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
    const orderIds = rows.map((row) => row.id);
    const materials = orderIds.length
      ? await prisma.orderItemMaterial.findMany({
          where: { orderId: { in: orderIds } },
          select: {
            id: true,
            orderId: true,
            orderItemId: true,
            name: true,
            quantity: true,
            unit: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : [];
    res.json(
      rows.map((row) => {
        const normalized = withNormalizedLines(row);
        const lineMaterials = materials.filter((material) => material.orderId === row.id);
        return {
          ...normalized,
          linesSnapshot: applyLineMaterials(normalized.linesSnapshot, lineMaterials),
        };
      }),
    );
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
    const materials = await prisma.orderItemMaterial.findMany({
      where: { orderId: row.id },
      select: {
        id: true,
        orderId: true,
        orderItemId: true,
        name: true,
        quantity: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const normalized = withNormalizedLines(row);
    res.json({
      ...normalized,
      linesSnapshot: applyLineMaterials(normalized.linesSnapshot, materials),
    });
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
    const force = parsed.data.force === true;
    if (force) {
      const hasPermission = await canForceOrderStatus(req);
      if (!hasPermission) {
        res.status(403).json({
          error: "insufficient_permissions",
          message: "Недостаточно прав для принудительной смены статуса.",
        });
        return;
      }
      if (status === "SHIPPED") {
        res.status(409).json({
          error: "illegal_status_transition",
          message: "Статус SHIPPED нельзя устанавливать в принудительном режиме.",
        });
        return;
      }
    }
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      req.log?.warn({ route: "PUT /production/orders/:id/status", orderId: id, reason: "not_found" });
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (!canTransitionOrderStatus(existing.productionStatus, status)) {
      if (!force) {
        res.status(409).json({
          error: "illegal_status_transition",
          from: existing.productionStatus,
          to: status,
          allowed: ORDER_STATUS_TRANSITIONS[existing.productionStatus],
        });
        return;
      }
    }
    if (status === "SHIPPED") {
      const actor = req.auth?.login ?? req.auth?.userId ?? "system";
      const row = await prisma.$transaction(async (tx) => {
        const orderForShipment = await tx.order.findUnique({
          where: { id },
          select: {
            id: true,
            orderNumber: true,
            linesSnapshot: true,
          },
        });
        if (!orderForShipment) {
          throw new OrderNotFoundInShipmentError();
        }

        const claim = await tx.order.updateMany({
          where: { id, stockDeducted: false },
          data: { stockDeducted: true, productionStatus: "SHIPPED" },
        });
        if (claim.count === 0) {
          throw new AlreadyDeductedError();
        }

        const normalizedLines = normalizeShipmentLines(orderForShipment.linesSnapshot);
        const resolvedLines: ResolvedShipmentLine[] = [];
        for (const line of normalizedLines) {
          const product = await resolveWarehouseProductForLine(tx, line);
          if (!product) {
            throw new ProductResolveError(line);
          }
          resolvedLines.push({
            ...line,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
          });
        }

        const requiredByProduct = new Map<string, { qty: number; name: string; sku: string }>();
        for (const line of resolvedLines) {
          const current = requiredByProduct.get(line.productId);
          if (current) {
            current.qty += line.qty;
          } else {
            requiredByProduct.set(line.productId, {
              qty: line.qty,
              name: line.productName,
              sku: line.productSku,
            });
          }
        }

        if (requiredByProduct.size > 0) {
          await applyOutgoing(
            tx,
            [...requiredByProduct.entries()].map(([productId, required]) => ({
              productId,
              quantity: required.qty,
              reason: `order_shipped:${orderForShipment.orderNumber}`,
              createdBy: actor,
            })),
          );
        }

        const updatedOrder = await tx.order.findUnique({
          where: { id },
          include: {
            assignments: { include: { worker: true } },
          },
        });
        if (!updatedOrder) {
          throw new OrderNotFoundInShipmentError();
        }
        return updatedOrder;
      });
      req.log?.info({ route: "PUT /production/orders/:id/status", orderId: id, status, stockDeducted: true });
      res.json(row);
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
    if (e instanceof OrderNotFoundInShipmentError) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (e instanceof AlreadyDeductedError) {
      res.status(409).json({ error: "stock_already_deducted", message: "Списание уже было выполнено для этого заказа." });
      return;
    }
    if (e instanceof StockInsufficientError) {
      res.status(422).json({
        error: "insufficient_stock",
        message: "Недостаточно товара на складе для отгрузки заказа.",
        item: e.details,
      });
      return;
    }
    if (e instanceof ProductResolveError) {
      res.status(422).json({
        error: "warehouse_product_not_found",
        message: "Не удалось сопоставить позицию заказа со складским товаром.",
        line: {
          lineNo: e.line.lineNo,
          name: e.line.name,
          sku: e.line.sku,
          catalogProductId: e.line.catalogProductId,
          required: e.line.qty,
        },
      });
      return;
    }
    req.log?.error({ route: "PUT /production/orders/:id/status", err: String(e) });
    next(e);
  }
});

productionRouter.put("/orders/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = OrderUpdateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const { deadline, productionStart, notes } = parsed.data;
    const parsedDeadline = parseIsoDate(deadline ?? undefined);
    if (deadline !== undefined && deadline !== null && deadline !== "" && !parsedDeadline) {
      res.status(400).json({ error: "invalid_body", message: "deadline must be a valid ISO date" });
      return;
    }
    const parsedProductionStart = parseIsoDate(productionStart ?? undefined);
    if (
      productionStart !== undefined &&
      productionStart !== null &&
      productionStart !== "" &&
      !parsedProductionStart
    ) {
      res.status(400).json({ error: "invalid_body", message: "productionStart must be a valid ISO date" });
      return;
    }
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(deadline !== undefined && {
          deadline: deadline ? parsedDeadline : null,
        }),
        ...(productionStart !== undefined && {
          productionStart: productionStart ? parsedProductionStart : null,
        }),
        ...(notes !== undefined && {
          notes: cleanNotes(notes),
        }),
      },
    });
    res.json(updated);
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = String((e as { code: unknown }).code);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
    }
    req.log?.error({ route: "PUT /production/orders/:id", err: String(e) });
    next(e);
  }
});

productionRouter.patch("/orders/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = OrderPatchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const { startDate, endDate, productionStart, deadline, notes } = parsed.data;
    const effectiveStartDate = startDate !== undefined ? startDate : productionStart;
    const effectiveEndDate = endDate !== undefined ? endDate : deadline;

    const parsedStartDate = parseIsoDate(effectiveStartDate ?? undefined);
    if (effectiveStartDate !== undefined && effectiveStartDate !== null && effectiveStartDate !== "" && !parsedStartDate) {
      res.status(400).json({ error: "invalid_body", message: "startDate must be a valid ISO date" });
      return;
    }
    const parsedEndDate = parseIsoDate(effectiveEndDate ?? undefined);
    if (effectiveEndDate !== undefined && effectiveEndDate !== null && effectiveEndDate !== "" && !parsedEndDate) {
      res.status(400).json({ error: "invalid_body", message: "endDate must be a valid ISO date" });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(effectiveStartDate !== undefined && {
          productionStart: effectiveStartDate ? parsedStartDate : null,
        }),
        ...(effectiveEndDate !== undefined && {
          deadline: effectiveEndDate ? parsedEndDate : null,
        }),
        ...(notes !== undefined && {
          notes: cleanNotes(notes),
        }),
      },
      include: {
        assignments: { include: { worker: true } },
      },
    });
    const materials = await prisma.orderItemMaterial.findMany({
      where: { orderId: updated.id },
      select: {
        id: true,
        orderId: true,
        orderItemId: true,
        name: true,
        quantity: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const normalized = withNormalizedLines(updated);
    res.json({
      ...normalized,
      linesSnapshot: applyLineMaterials(normalized.linesSnapshot, materials),
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = String((e as { code: unknown }).code);
      if (code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
    }
    req.log?.error({ route: "PATCH /production/orders/:id", err: String(e) });
    next(e);
  }
});

productionRouter.post("/orders/:orderId/items/:itemId/materials", async (req, res, next) => {
  const { orderId, itemId } = req.params;
  try {
    if (!orderId || !itemId) {
      res.status(400).json({ error: "missing_params" });
      return;
    }
    const parsed = OrderItemMaterialCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, linesSnapshot: true },
    });
    if (!order) {
      res.status(404).json({ error: "order_not_found" });
      return;
    }
    const lines = normalizeLinesSnapshot(order.linesSnapshot);
    const hasLine = lines.some((line) => {
      const lineId = toLineItemId(line);
      if (lineId && lineId === itemId) return true;
      const lineNo = Number(line.lineNo);
      return Number.isFinite(lineNo) && String(lineNo) === itemId;
    });
    if (!hasLine) {
      res.status(404).json({ error: "item_not_found" });
      return;
    }
    const created = await prisma.orderItemMaterial.create({
      data: {
        orderId,
        orderItemId: itemId,
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
      },
    });
    res.status(201).json(created);
  } catch (e) {
    req.log?.error({ route: "POST /production/orders/:orderId/items/:itemId/materials", err: String(e) });
    next(e);
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
      data: { linesSnapshot: lines as Prisma.InputJsonValue },
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
