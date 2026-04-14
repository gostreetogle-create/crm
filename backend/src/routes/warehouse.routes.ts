import { Router } from "express";
import { z } from "zod";
import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const warehouseRouter = Router();

const unitSchema = z.enum(["шт", "кг", "л"]);
const movementTypeSchema = z.enum(["incoming", "outgoing", "adjustment"]);

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sortBy: z.enum(["name", "category", "quantity", "price", "createdAt", "updatedAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

const productInputSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  category: z.string().trim().min(1),
  quantity: z.number().finite().min(0),
  unit: unitSchema,
  minStockLevel: z.number().finite().min(0),
  price: z.number().finite().min(0),
  supplierName: z.string().trim().max(255).nullable().optional(),
  warehouseLocation: z.string().trim().max(255).nullable().optional(),
});

const movementInputSchema = z.object({
  productId: z.string().uuid(),
  type: movementTypeSchema,
  quantity: z.number().finite().positive(),
  reason: z.string().trim().max(500).nullable().optional(),
});

function toNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function mapMovementTypeToDb(type: z.infer<typeof movementTypeSchema>): StockMovementType {
  if (type === "incoming") return StockMovementType.INCOMING;
  if (type === "outgoing") return StockMovementType.OUTGOING;
  return StockMovementType.ADJUSTMENT;
}

function mapMovementTypeFromDb(type: StockMovementType): "incoming" | "outgoing" | "adjustment" {
  if (type === StockMovementType.INCOMING) return "incoming";
  if (type === StockMovementType.OUTGOING) return "outgoing";
  return "adjustment";
}

function movementDelta(type: StockMovementType, quantity: number): number {
  if (type === StockMovementType.INCOMING) return quantity;
  if (type === StockMovementType.OUTGOING) return -quantity;
  return quantity;
}

class ProductNotFoundError extends Error {
  constructor() {
    super("product_not_found");
  }
}

class InsufficientStockError extends Error {
  constructor() {
    super("insufficient_stock");
  }
}

warehouseRouter.get("/products", async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
      return;
    }

    const search = parsed.data.search?.trim();
    const category = parsed.data.category?.trim();
    const sortBy = parsed.data.sortBy ?? "updatedAt";
    const sortDir = parsed.data.sortDir ?? "desc";

    const where: Prisma.WarehouseProductWhereInput = {
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { warehouseLocation: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.WarehouseProductOrderByWithRelationInput = { [sortBy]: sortDir };
    const rows = await prisma.warehouseProduct.findMany({ where, orderBy });
    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        quantity: row.quantity,
        unit: row.unit,
        minStockLevel: row.minStockLevel,
        price: row.price,
        supplierName: row.supplierName,
        warehouseLocation: row.warehouseLocation,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        isBelowMinStockLevel: row.quantity < row.minStockLevel,
      })),
    );
  } catch (error) {
    next(error);
  }
});

warehouseRouter.post("/products", async (req, res, next) => {
  try {
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const created = await prisma.warehouseProduct.create({
      data: {
        ...body,
        supplierName: toNullableString(body.supplierName),
        warehouseLocation: toNullableString(body.warehouseLocation),
      },
    });
    req.log?.info({ action: "warehouse_product_created", productId: created.id, sku: created.sku });
    res.status(201).json({
      id: created.id,
      name: created.name,
      sku: created.sku,
      category: created.category,
      quantity: created.quantity,
      unit: created.unit,
      minStockLevel: created.minStockLevel,
      price: created.price,
      supplierName: created.supplierName,
      warehouseLocation: created.warehouseLocation,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      isBelowMinStockLevel: created.quantity < created.minStockLevel,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "duplicate_sku" });
      return;
    }
    next(error);
  }
});

warehouseRouter.get("/products/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.warehouseProduct.findUnique({ where: { id } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      minStockLevel: row.minStockLevel,
      price: row.price,
      supplierName: row.supplierName,
      warehouseLocation: row.warehouseLocation,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isBelowMinStockLevel: row.quantity < row.minStockLevel,
    });
  } catch (error) {
    next(error);
  }
});

warehouseRouter.put("/products/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const updated = await prisma.warehouseProduct.update({
      where: { id },
      data: {
        ...body,
        supplierName: toNullableString(body.supplierName),
        warehouseLocation: toNullableString(body.warehouseLocation),
      },
    });
    req.log?.info({ action: "warehouse_product_updated", productId: updated.id, sku: updated.sku });
    res.json({
      id: updated.id,
      name: updated.name,
      sku: updated.sku,
      category: updated.category,
      quantity: updated.quantity,
      unit: updated.unit,
      minStockLevel: updated.minStockLevel,
      price: updated.price,
      supplierName: updated.supplierName,
      warehouseLocation: updated.warehouseLocation,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      isBelowMinStockLevel: updated.quantity < updated.minStockLevel,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "duplicate_sku" });
      return;
    }
    next(error);
  }
});

warehouseRouter.delete("/products/:id", async (req, res, next) => {
  try {
    const id = req.params["id"];
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    await prisma.warehouseProduct.delete({ where: { id } });
    req.log?.info({ action: "warehouse_product_deleted", productId: id });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ error: "not_found" });
      return;
    }
    next(error);
  }
});

warehouseRouter.post("/movements", async (req, res, next) => {
  try {
    const parsed = movementInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const dbType = mapMovementTypeToDb(body.type);
    const actor = req.auth?.login ?? req.auth?.userId ?? "system";

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.warehouseProduct.findUnique({ where: { id: body.productId } });
      if (!product) {
        throw new ProductNotFoundError();
      }
      const nextQuantity = product.quantity + movementDelta(dbType, body.quantity);
      if (nextQuantity < 0) {
        throw new InsufficientStockError();
      }
      const movement = await tx.warehouseStockMovement.create({
        data: {
          productId: body.productId,
          type: dbType,
          quantity: body.quantity,
          reason: toNullableString(body.reason),
          createdBy: actor,
        },
      });
      await tx.warehouseProduct.update({
        where: { id: body.productId },
        data: { quantity: nextQuantity },
      });
      return movement;
    });

    req.log?.info({
      action: "warehouse_movement_created",
      movementId: created.id,
      productId: created.productId,
      type: created.type,
      quantity: created.quantity,
    });

    res.status(201).json({
      id: created.id,
      productId: created.productId,
      type: mapMovementTypeFromDb(created.type),
      quantity: created.quantity,
      reason: created.reason,
      createdBy: created.createdBy,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      res.status(409).json({ error: "insufficient_stock" });
      return;
    }
    if (error instanceof ProductNotFoundError) {
      res.status(404).json({ error: "product_not_found" });
      return;
    }
    next(error);
  }
});

warehouseRouter.get("/movements", async (_req, res, next) => {
  try {
    const movements = await prisma.warehouseStockMovement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true, category: true },
        },
      },
    });
    res.json(
      movements.map((item) => ({
        id: item.id,
        productId: item.productId,
        type: mapMovementTypeFromDb(item.type),
        quantity: item.quantity,
        reason: item.reason,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
        product: item.product,
      })),
    );
  } catch (error) {
    next(error);
  }
});

warehouseRouter.get("/summary", async (_req, res, next) => {
  try {
    const products = await prisma.warehouseProduct.findMany({
      select: { quantity: true, minStockLevel: true, price: true },
    });
    const totalProducts = products.length;
    const lowStockCount = products.filter((row) => row.quantity < row.minStockLevel).length;
    const totalValue = products.reduce((sum, row) => sum + row.quantity * row.price, 0);
    res.json({
      totalProducts,
      lowStockCount,
      totalValue,
    });
  } catch (error) {
    next(error);
  }
});
