import { StockMovementType, type Prisma } from "@prisma/client";

type StockMovementItem = {
  productId: string;
  quantity: number;
  reason?: string | null;
  createdBy?: string | null;
};

type NormalizedStockItem = {
  productId: string;
  quantity: number;
  reason: string | null;
  createdBy: string | null;
};

export class StockProductNotFoundError extends Error {
  constructor(public readonly productId: string) {
    super("product_not_found");
  }
}

export class StockInsufficientError extends Error {
  constructor(
    public readonly details: {
      productId: string;
      name: string;
      sku: string;
      required: number;
      available: number;
    },
  ) {
    super("insufficient_stock");
  }
}

function normalizeItems(items: StockMovementItem[]): NormalizedStockItem[] {
  const out: NormalizedStockItem[] = [];
  for (const item of items) {
    const productId = String(item.productId ?? "").trim();
    const quantity = Number(item.quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
    const reasonRaw = item.reason == null ? null : String(item.reason).trim();
    const createdByRaw = item.createdBy == null ? null : String(item.createdBy).trim();
    out.push({
      productId,
      quantity,
      reason: reasonRaw ? reasonRaw : null,
      createdBy: createdByRaw ? createdByRaw : null,
    });
  }
  return out;
}

function groupByProduct(items: NormalizedStockItem[]): Array<{ productId: string; quantity: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return [...map.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export async function validateStock(
  tx: Prisma.TransactionClient,
  items: StockMovementItem[],
): Promise<void> {
  const normalized = normalizeItems(items);
  const grouped = groupByProduct(normalized);
  if (grouped.length === 0) return;

  const products = await tx.warehouseProduct.findMany({
    where: { id: { in: grouped.map((x) => x.productId) } },
    select: { id: true, name: true, sku: true, quantity: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const req of grouped) {
    const product = byId.get(req.productId);
    if (!product) {
      throw new StockProductNotFoundError(req.productId);
    }
    if (product.quantity < req.quantity) {
      throw new StockInsufficientError({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        required: req.quantity,
        available: product.quantity,
      });
    }
  }
}

export async function applyOutgoing(
  tx: Prisma.TransactionClient,
  items: StockMovementItem[],
): Promise<void> {
  const normalized = normalizeItems(items);
  if (normalized.length === 0) return;
  await validateStock(tx, normalized);

  for (const item of normalized) {
    await tx.warehouseStockMovement.create({
      data: {
        productId: item.productId,
        type: StockMovementType.OUTGOING,
        quantity: item.quantity,
        reason: item.reason,
        createdBy: item.createdBy,
      },
    });
    await tx.warehouseProduct.update({
      where: { id: item.productId },
      data: { quantity: { decrement: item.quantity } },
    });
  }
}

export async function applyIncoming(
  tx: Prisma.TransactionClient,
  items: StockMovementItem[],
): Promise<void> {
  const normalized = normalizeItems(items);
  if (normalized.length === 0) return;

  for (const item of normalized) {
    const product = await tx.warehouseProduct.findUnique({
      where: { id: item.productId },
      select: { id: true },
    });
    if (!product) {
      throw new StockProductNotFoundError(item.productId);
    }
    await tx.warehouseStockMovement.create({
      data: {
        productId: item.productId,
        type: StockMovementType.INCOMING,
        quantity: item.quantity,
        reason: item.reason,
        createdBy: item.createdBy,
      },
    });
    await tx.warehouseProduct.update({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    });
  }
}
