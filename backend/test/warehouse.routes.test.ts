import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: "шт" | "кг" | "л";
  minStockLevel: number;
  price: number;
  supplierName: string | null;
  warehouseLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MovementRow = {
  id: string;
  productId: string;
  type: "INCOMING" | "OUTGOING" | "ADJUSTMENT";
  quantity: number;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
};

let productsDb: ProductRow[] = [];
let movementsDb: MovementRow[] = [];

const mockPrisma = {
  warehouseProduct: {
    findMany: vi.fn((args?: any) => {
      let rows = [...productsDb];
      if (args?.where?.category?.equals) {
        const category = String(args.where.category.equals).toLowerCase();
        rows = rows.filter((r) => r.category.toLowerCase() === category);
      }
      if (args?.where?.OR && Array.isArray(args.where.OR)) {
        const q = String(args.where.OR[0]?.name?.contains ?? "").toLowerCase();
        rows = rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q) ||
            (r.supplierName ?? "").toLowerCase().includes(q) ||
            (r.warehouseLocation ?? "").toLowerCase().includes(q),
        );
      }
      if (args?.select) {
        return Promise.resolve(
          rows.map((r) => ({
            quantity: r.quantity,
            minStockLevel: r.minStockLevel,
            price: r.price,
          })),
        );
      }
      return Promise.resolve(rows);
    }),
    findUnique: vi.fn(({ where }: { where: { id: string } }) => {
      return Promise.resolve(productsDb.find((p) => p.id === where.id) ?? null);
    }),
    create: vi.fn(({ data }: any) => {
      const now = new Date();
      const row: ProductRow = {
        id: `product-${productsDb.length + 1}`,
        name: data.name,
        sku: data.sku,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        minStockLevel: data.minStockLevel,
        price: data.price,
        supplierName: data.supplierName ?? null,
        warehouseLocation: data.warehouseLocation ?? null,
        createdAt: now,
        updatedAt: now,
      };
      productsDb.push(row);
      return Promise.resolve(row);
    }),
    update: vi.fn(({ where, data }: any) => {
      const idx = productsDb.findIndex((p) => p.id === where.id);
      if (idx === -1) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError("not_found", {
            code: "P2025",
            clientVersion: "test",
          }),
        );
      }
      productsDb[idx] = { ...productsDb[idx], ...data, updatedAt: new Date() };
      return Promise.resolve(productsDb[idx]);
    }),
    delete: vi.fn(({ where }: any) => {
      const idx = productsDb.findIndex((p) => p.id === where.id);
      if (idx === -1) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError("not_found", {
            code: "P2025",
            clientVersion: "test",
          }),
        );
      }
      const [removed] = productsDb.splice(idx, 1);
      movementsDb = movementsDb.filter((m) => m.productId !== removed.id);
      return Promise.resolve(removed);
    }),
  },
  warehouseStockMovement: {
    findMany: vi.fn(() => {
      return Promise.resolve(
        movementsDb
          .slice()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((m) => ({
            ...m,
            product: (() => {
              const p = productsDb.find((x) => x.id === m.productId);
              return p
                ? { id: p.id, name: p.name, sku: p.sku, unit: p.unit, category: p.category }
                : { id: m.productId, name: "", sku: "", unit: "шт" as const, category: "" };
            })(),
          })),
      );
    }),
    create: vi.fn(({ data }: any) => {
      const row: MovementRow = {
        id: `movement-${movementsDb.length + 1}`,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason ?? null,
        createdBy: data.createdBy ?? null,
        createdAt: new Date(),
      };
      movementsDb.push(row);
      return Promise.resolve(row);
    }),
  },
  $transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => callback(mockPrisma)),
};

vi.mock("../src/lib/prisma.js", () => ({ prisma: mockPrisma }));

function seedProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  const now = new Date();
  const row: ProductRow = {
    id: `seed-${productsDb.length + 1}`,
    name: "Краска фасадная",
    sku: `SKU-${productsDb.length + 1}`,
    category: "Краски",
    quantity: 10,
    unit: "шт",
    minStockLevel: 3,
    price: 1200,
    supplierName: "ООО Поставщик",
    warehouseLocation: "A-01",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  productsDb.push(row);
  return row;
}

async function createTestApp() {
  const { warehouseRouter } = await import("../src/routes/warehouse.routes.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId: "u1", login: "tester", roleId: "r1" };
    req.log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    next();
  });
  app.use("/api/warehouse", warehouseRouter);
  return app;
}

describe("warehouse routes", () => {
  beforeEach(() => {
    productsDb = [];
    movementsDb = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    movementsDb = [];
    productsDb = [];
  });

  it("GET /api/warehouse/products returns empty list", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/api/warehouse/products");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /api/warehouse/products returns list with data", async () => {
    seedProduct({ name: "Товар 1", sku: "A-1" });
    seedProduct({ name: "Товар 2", sku: "B-2" });
    const app = await createTestApp();
    const res = await request(app).get("/api/warehouse/products");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("GET /api/warehouse/products filters by search", async () => {
    seedProduct({ name: "Грунтовка белая", sku: "GR-001" });
    seedProduct({ name: "Лак прозрачный", sku: "LK-002" });
    const app = await createTestApp();
    const res = await request(app).get("/api/warehouse/products").query({ search: "грунт" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sku).toBe("GR-001");
  });

  it("POST /api/warehouse/products creates product", async () => {
    const app = await createTestApp();
    const res = await request(app).post("/api/warehouse/products").send({
      name: "Новый товар",
      sku: "NEW-1",
      category: "Категория",
      quantity: 7,
      unit: "шт",
      minStockLevel: 2,
      price: 999,
      supplierName: "Поставщик",
      warehouseLocation: "B-2",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sku: "NEW-1", name: "Новый товар" });
    expect(productsDb).toHaveLength(1);
  });

  it("POST /api/warehouse/products returns validation error", async () => {
    const app = await createTestApp();
    const res = await request(app).post("/api/warehouse/products").send({
      name: "",
      sku: "",
      category: "",
      quantity: -1,
      unit: "шт",
      minStockLevel: -1,
      price: -1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_body");
  });

  it("GET /api/warehouse/products/:id returns found product", async () => {
    const item = seedProduct({ id: "p-1", sku: "FOUND-1" });
    const app = await createTestApp();
    const res = await request(app).get(`/api/warehouse/products/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.sku).toBe("FOUND-1");
  });

  it("GET /api/warehouse/products/:id returns 404 for missing", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/api/warehouse/products/missing");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("PUT /api/warehouse/products/:id updates product", async () => {
    const item = seedProduct({ id: "p-2", name: "Before" });
    const app = await createTestApp();
    const res = await request(app).put(`/api/warehouse/products/${item.id}`).send({
      name: "After",
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minStockLevel: item.minStockLevel,
      price: item.price,
      supplierName: item.supplierName,
      warehouseLocation: item.warehouseLocation,
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("After");
  });

  it("PUT /api/warehouse/products/:id returns 404", async () => {
    const app = await createTestApp();
    const res = await request(app).put("/api/warehouse/products/absent").send({
      name: "X",
      sku: "X-1",
      category: "X",
      quantity: 1,
      unit: "шт",
      minStockLevel: 0,
      price: 1,
      supplierName: null,
      warehouseLocation: null,
    });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("DELETE /api/warehouse/products/:id deletes product", async () => {
    const item = seedProduct({ id: "p-3" });
    const app = await createTestApp();
    const res = await request(app).delete(`/api/warehouse/products/${item.id}`);
    expect(res.status).toBe(204);
    expect(productsDb.find((p) => p.id === item.id)).toBeUndefined();
  });

  it("DELETE /api/warehouse/products/:id returns 404", async () => {
    const app = await createTestApp();
    const res = await request(app).delete("/api/warehouse/products/missing");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("POST /api/warehouse/movements INCOMING increases quantity", async () => {
    seedProduct({ id: "11111111-1111-4111-8111-111111111111", quantity: 5 });
    const app = await createTestApp();
    const res = await request(app).post("/api/warehouse/movements").send({
      productId: "11111111-1111-4111-8111-111111111111",
      type: "incoming",
      quantity: 3,
      reason: "Поставка",
    });
    expect(res.status).toBe(201);
    expect(productsDb.find((p) => p.id === "11111111-1111-4111-8111-111111111111")?.quantity).toBe(8);
  });

  it("POST /api/warehouse/movements OUTGOING decreases quantity", async () => {
    seedProduct({ id: "22222222-2222-4222-8222-222222222222", quantity: 10 });
    const app = await createTestApp();
    const res = await request(app).post("/api/warehouse/movements").send({
      productId: "22222222-2222-4222-8222-222222222222",
      type: "outgoing",
      quantity: 4,
      reason: "Отгрузка",
    });
    expect(res.status).toBe(201);
    expect(productsDb.find((p) => p.id === "22222222-2222-4222-8222-222222222222")?.quantity).toBe(6);
  });

  it("POST /api/warehouse/movements returns 409 when outgoing exceeds stock", async () => {
    seedProduct({ id: "33333333-3333-4333-8333-333333333333", quantity: 2 });
    const app = await createTestApp();
    const res = await request(app).post("/api/warehouse/movements").send({
      productId: "33333333-3333-4333-8333-333333333333",
      type: "outgoing",
      quantity: 5,
      reason: "Перерасход",
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "insufficient_stock" });
  });

  it("GET /api/warehouse/summary returns expected structure", async () => {
    seedProduct({ quantity: 2, minStockLevel: 3, price: 100 });
    seedProduct({ quantity: 4, minStockLevel: 1, price: 50 });
    const app = await createTestApp();
    const res = await request(app).get("/api/warehouse/summary");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalProducts: 2,
      lowStockCount: 1,
      totalValue: 400,
    });
  });
});
