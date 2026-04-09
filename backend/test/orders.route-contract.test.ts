import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

function makeOrder(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-04-10T00:00:00.000Z");
  return {
    id: "order-1",
    commercialOfferId: "11111111-1111-1111-1111-111111111111",
    orderNumber: "ORD-100",
    offerNumber: "КП-000123",
    customerLabel: "ООО Тест",
    deadline: null,
    notes: null,
    linesSnapshot: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("ordersRouter contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / returns mapped list", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.findMany).mockResolvedValueOnce([makeOrder()] as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).get("/orders");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "order-1",
      orderNumber: "ORD-100",
      offerNumber: "КП-000123",
    });
  });

  it("POST / returns 409 order_exists_for_offer on unique conflict", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.create).mockRejectedValueOnce({ code: "P2002" });
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).post("/orders").send({
      commercialOfferId: "550e8400-e29b-41d4-a716-446655440000",
      orderNumber: "ORD-1",
      customerLabel: "ООО Тест",
      linesSnapshot: [],
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "order_exists_for_offer",
      message: "Для этого КП заказ уже создан.",
    });
  });

  it("POST / returns 409 invalid_offer_ref on foreign key conflict", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.create).mockRejectedValueOnce({ code: "P2003" });
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).post("/orders").send({
      commercialOfferId: "550e8400-e29b-41d4-a716-446655440000",
      orderNumber: "ORD-1",
      customerLabel: "ООО Тест",
      linesSnapshot: [],
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "invalid_offer_ref",
      message: "Указанный КП не найден.",
    });
  });

  it("POST / returns 400 invalid_body for malformed payload", async () => {
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).post("/orders").send({
      commercialOfferId: "not-a-uuid",
      orderNumber: "",
      customerLabel: "",
      linesSnapshot: "wrong-type",
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: "invalid_body",
    });
  });

  it("PUT /:id returns 404 on missing order", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.update).mockRejectedValueOnce({ code: "P2025" });
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).put("/orders/order-missing").send({ orderNumber: "ORD-2" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("PUT /:id returns 400 invalid_body for malformed payload", async () => {
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).put("/orders/order-1").send({ orderNumber: "" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: "invalid_body",
    });
  });

  it("DELETE /:id returns 204 on success", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.delete).mockResolvedValueOnce(makeOrder() as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).delete("/orders/order-1");
    expect(res.status).toBe(204);
  });
});
