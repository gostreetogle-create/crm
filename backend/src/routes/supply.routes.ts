import { Router } from "express";
import { z } from "zod";
import { SupplyItemStatus, SupplyRequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { applyIncoming } from "../services/warehouse/stock-movement.service.js";

export const supplyRouter = Router();

const ListQuerySchema = z.object({
  status: z.nativeEnum(SupplyRequestStatus).optional(),
});

const ReceiveBodySchema = z.object({
  items: z
    .array(
      z.object({
        supplyItemId: z.string().uuid(),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});

class WarehouseProductNotFoundError extends Error {
  constructor() {
    super("warehouse_product_not_found");
  }
}

class SupplyItemNotFoundError extends Error {
  constructor(public readonly supplyItemId: string) {
    super("supply_item_not_found");
  }
}

function toRequestStatus(items: Array<{ status: SupplyItemStatus; receivedQty: number }>): SupplyRequestStatus {
  if (items.length > 0 && items.every((item) => item.status === SupplyItemStatus.RECEIVED)) {
    return SupplyRequestStatus.RECEIVED;
  }
  if (items.some((item) => item.receivedQty > 0)) {
    return SupplyRequestStatus.PARTIAL;
  }
  return SupplyRequestStatus.OPEN;
}

supplyRouter.get("/", async (req, res, next) => {
  try {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
      return;
    }
    const rows = await prisma.supplyRequest.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: { id: true, orderNumber: true, customerLabel: true, createdAt: true },
        },
        items: {
          select: { id: true, qty: true, receivedQty: true, status: true },
        },
      },
    });
    res.json(
      rows.map((row) => ({
        id: row.id,
        status: row.status,
        order: row.order,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        totals: {
          items: row.items.length,
          requiredQty: row.items.reduce((acc, item) => acc + item.qty, 0),
          receivedQty: row.items.reduce((acc, item) => acc + item.receivedQty, 0),
          receivedItems: row.items.filter((item) => item.status === SupplyItemStatus.RECEIVED).length,
        },
      })),
    );
  } catch (e) {
    next(e);
  }
});

supplyRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: { id: true, orderNumber: true, customerLabel: true, createdAt: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      id: row.id,
      status: row.status,
      order: row.order,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      items: row.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        qty: item.qty,
        unit: item.unit,
        warehouseProductId: item.warehouseProductId,
        receivedQty: item.receivedQty,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    next(e);
  }
});

supplyRouter.post("/:id/receive", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = ReceiveBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }

    const actor = req.auth?.login ?? req.auth?.userId ?? "system";

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.supplyRequest.findUnique({
        where: { id },
        include: {
          items: true,
          order: { select: { orderNumber: true } },
        },
      });
      if (!request) {
        return null;
      }
      const itemsById = new Map(request.items.map((item) => [item.id, item]));
      const incoming: Array<{ productId: string; quantity: number; reason: string; createdBy: string }> = [];

      for (const row of parsed.data.items) {
        const item = itemsById.get(row.supplyItemId);
        if (!item) {
          throw new SupplyItemNotFoundError(row.supplyItemId);
        }
        const remain = Math.max(0, item.qty - item.receivedQty);
        const acceptedQty = Math.min(remain, row.qty);
        if (acceptedQty <= 0) {
          continue;
        }

        let warehouseProductId = item.warehouseProductId;
        if (!warehouseProductId) {
          const bySku =
            item.sku && item.sku.trim()
              ? await tx.warehouseProduct.findUnique({
                  where: { sku: item.sku.trim() },
                  select: { id: true },
                })
              : null;
          const byName =
            bySku ??
            (await tx.warehouseProduct.findFirst({
              where: { name: { equals: item.productName, mode: "insensitive" } },
              select: { id: true },
            }));
          if (!byName) throw new WarehouseProductNotFoundError();
          warehouseProductId = byName.id;
        }

        const nextReceived = item.receivedQty + acceptedQty;
        const nextStatus =
          nextReceived >= item.qty ? SupplyItemStatus.RECEIVED : SupplyItemStatus.PARTIAL;

        await tx.supplyRequestItem.update({
          where: { id: item.id },
          data: {
            warehouseProductId,
            receivedQty: nextReceived,
            status: nextStatus,
          },
        });
        incoming.push({
          productId: warehouseProductId,
          quantity: acceptedQty,
          reason: `supply_receive:${request.order.orderNumber}`,
          createdBy: actor,
        });
      }

      if (incoming.length > 0) {
        await applyIncoming(tx, incoming);
      }

      const refreshedItems = await tx.supplyRequestItem.findMany({
        where: { supplyRequestId: id },
        select: { status: true, receivedQty: true },
      });
      await tx.supplyRequest.update({
        where: { id },
        data: { status: toRequestStatus(refreshedItems) },
      });

      return tx.supplyRequest.findUnique({
        where: { id },
        include: {
          order: { select: { id: true, orderNumber: true, customerLabel: true, createdAt: true } },
          items: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    if (!updated) {
      if (!res.headersSent) {
        res.status(404).json({ error: "not_found" });
      }
      return;
    }

    res.json({
      id: updated.id,
      status: updated.status,
      order: updated.order,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      items: updated.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        qty: item.qty,
        unit: item.unit,
        warehouseProductId: item.warehouseProductId,
        receivedQty: item.receivedQty,
        status: item.status,
      })),
    });
  } catch (e) {
    if (e instanceof WarehouseProductNotFoundError) {
      res.status(422).json({
        error: "warehouse_product_not_found",
        message: "Не удалось сопоставить позицию заявки со складским товаром.",
      });
      return;
    }
    if (e instanceof SupplyItemNotFoundError) {
      res.status(404).json({ error: "supply_item_not_found", supplyItemId: e.supplyItemId });
      return;
    }
    next(e);
  }
});
