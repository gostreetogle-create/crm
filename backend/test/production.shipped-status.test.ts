import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type OrderRow = {
  id: string;
  orderNumber: string;
  productionStatus: "PENDING" | "IN_PROGRESS" | "DONE" | "SHIPPED";
  stockDeducted: boolean;
  linesSnapshot: Array<{
    lineNo: number;
    name: string;
    qty: number;
    unit: string;
    sku?: string | null;
    catalogProductId?: string | null;
  }>;
  assignments: Array<{ id: string; workerId: string; lineNo: number; status: string; startDate: string; endDate: string }>;
};

type WarehouseProductRow = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
};

type MovementRow = {
  id: string;
  productId: string;
  type: "OUTGOING";
  quantity: number;
  reason: string | null;
  createdBy: string | null;
};

let orderDb: OrderRow | null = null;
let warehouseDb: WarehouseProductRow[] = [];
let movementsDb: MovementRow[] = [];

function cloneState() {
  return {
    orderDb: orderDb ? JSON.parse(JSON.stringify(orderDb)) : null,
    warehouseDb: JSON.parse(JSON.stringify(warehouseDb)),
    movementsDb: JSON.parse(JSON.stringify(movementsDb)),
  };
}

function restoreState(snapshot: ReturnType<typeof cloneState>) {
  orderDb = snapshot.orderDb;
  warehouseDb = snapshot.warehouseDb;
  movementsDb = snapshot.movementsDb;
}

const mockPrisma = {
  order: {
    findUnique: vi.fn((args: any) => {
      const id = args?.where?.id;
      if (!orderDb || orderDb.id !== id) return Promise.resolve(null);
      if (args?.select) {
        const selected: Record<string, unknown> = {};
        for (const key of Object.keys(args.select)) {
          if (args.select[key]) selected[key] = (orderDb as any)[key];
        }
        return Promise.resolve(selected);
      }
      if (args?.include?.assignments) {
        return Promise.resolve({ ...orderDb, assignments: orderDb.assignments });
      }
      return Promise.resolve({ ...orderDb });
    }),
    updateMany: vi.fn(({ where, data }: any) => {
      if (!orderDb) return Promise.resolve({ count: 0 });
      if (orderDb.id !== where.id) return Promise.resolve({ count: 0 });
      if (where.stockDeducted === false && orderDb.stockDeducted !== false) {
        return Promise.resolve({ count: 0 });
      }
      orderDb = {
        ...orderDb,
        stockDeducted: data.stockDeducted ?? orderDb.stockDeducted,
        productionStatus: data.productionStatus ?? orderDb.productionStatus,
      };
      return Promise.resolve({ count: 1 });
    }),
    update: vi.fn(({ where, data }: any) => {
      if (!orderDb || orderDb.id !== where.id) return Promise.reject(new Error("not_found"));
      orderDb = { ...orderDb, ...data };
      return Promise.resolve({ ...orderDb, assignments: orderDb.assignments });
    }),
  },
  warehouseProduct: {
    findUnique: vi.fn(({ where }: any) => {
      if (where?.sku) return Promise.resolve(warehouseDb.find((p) => p.sku === where.sku) ?? null);
      if (where?.id) return Promise.resolve(warehouseDb.find((p) => p.id === where.id) ?? null);
      return Promise.resolve(null);
    }),
    findFirst: vi.fn(({ where }: any) => {
      const name = String(where?.name?.equals ?? "").toLowerCase();
      return Promise.resolve(warehouseDb.find((p) => p.name.toLowerCase() === name) ?? null);
    }),
    findMany: vi.fn(({ where }: any) => {
      const ids = Array.isArray(where?.id?.in) ? where.id.in : [];
      return Promise.resolve(
        warehouseDb.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, quantity: p.quantity })),
      );
    }),
    update: vi.fn(({ where, data }: any) => {
      const idx = warehouseDb.findIndex((p) => p.id === where.id);
      if (idx < 0) return Promise.reject(new Error("product_not_found"));
      const dec = Number(data?.quantity?.decrement ?? 0);
      warehouseDb[idx] = { ...warehouseDb[idx], quantity: warehouseDb[idx].quantity - dec };
      return Promise.resolve(warehouseDb[idx]);
    }),
  },
  warehouseStockMovement: {
    create: vi.fn(({ data }: any) => {
      const row: MovementRow = {
        id: `mv-${movementsDb.length + 1}`,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason ?? null,
        createdBy: data.createdBy ?? null,
      };
      movementsDb.push(row);
      return Promise.resolve(row);
    }),
  },
  tradeGood: {
    findUnique: vi.fn(() => Promise.resolve(null)),
  },
  $transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => {
    const snapshot = cloneState();
    try {
      return await callback(mockPrisma);
    } catch (error) {
      restoreState(snapshot);
      throw error;
    }
  }),
};

vi.mock("../src/lib/prisma.js", () => ({ prisma: mockPrisma }));

async function createApp() {
  const { productionRouter } = await import("../src/routes/production.routes.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId: "u1", login: "tester", roleId: "r1" };
    req.log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    next();
  });
  app.use("/api/production", productionRouter);
  return app;
}

function seedOrder(overrides: Partial<OrderRow> = {}) {
  orderDb = {
    id: "order-1",
    orderNumber: "ORD-100",
    productionStatus: "DONE",
    stockDeducted: false,
    linesSnapshot: [
      {
        lineNo: 1,
        name: "Товар 1",
        qty: 3,
        unit: "шт",
        sku: "SKU-1",
      },
    ],
    assignments: [],
    ...overrides,
  };
}

describe("production status SHIPPED stock deduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderDb = null;
    warehouseDb = [];
    movementsDb = [];
  });

  it("ships order successfully and deducts stock once", async () => {
    seedOrder();
    warehouseDb = [{ id: "wp-1", name: "Товар 1", sku: "SKU-1", quantity: 10 }];
    const app = await createApp();

    const res = await request(app).put("/api/production/orders/order-1/status").send({ status: "SHIPPED" });

    expect(res.status).toBe(200);
    expect(res.body.productionStatus).toBe("SHIPPED");
    expect(res.body.stockDeducted).toBe(true);
    expect(movementsDb).toHaveLength(1);
    expect(movementsDb[0]).toMatchObject({
      productId: "wp-1",
      type: "OUTGOING",
      quantity: 3,
    });
    expect(warehouseDb.find((p) => p.id === "wp-1")?.quantity).toBe(7);
  });

  it("returns 409 when stock was already deducted", async () => {
    seedOrder({ stockDeducted: true, productionStatus: "SHIPPED" });
    warehouseDb = [{ id: "wp-1", name: "Товар 1", sku: "SKU-1", quantity: 10 }];
    const app = await createApp();

    const res = await request(app).put("/api/production/orders/order-1/status").send({ status: "SHIPPED" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: "stock_already_deducted" });
    expect(movementsDb).toHaveLength(0);
  });

  it("returns 422 with item details when stock is insufficient", async () => {
    seedOrder({
      linesSnapshot: [
        {
          lineNo: 1,
          name: "Товар 1",
          qty: 8,
          unit: "шт",
          sku: "SKU-1",
        },
      ],
    });
    warehouseDb = [{ id: "wp-1", name: "Товар 1", sku: "SKU-1", quantity: 5 }];
    const app = await createApp();

    const res = await request(app).put("/api/production/orders/order-1/status").send({ status: "SHIPPED" });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("insufficient_stock");
    expect(res.body.item).toMatchObject({
      productId: "wp-1",
      sku: "SKU-1",
      name: "Товар 1",
      required: 8,
      available: 5,
    });
    expect(orderDb?.stockDeducted).toBe(false);
    expect(orderDb?.productionStatus).toBe("DONE");
    expect(movementsDb).toHaveLength(0);
  });
});
