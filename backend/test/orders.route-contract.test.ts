import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const listRow = {
  id: "order-1",
  commercialOfferId: "550e8400-e29b-41d4-a716-446655440000",
  orderNumber: "ORD-000001",
  offerNumber: "КП-000123",
  customerLabel: "ООО Тест",
  deadline: null,
  notes: null,
  linesSnapshot: [],
  createdAt: new Date("2026-04-10T00:00:00.000Z"),
  updatedAt: new Date("2026-04-10T00:00:00.000Z"),
};

describe("ordersRouter contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / returns mapped list", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([listRow] as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).get("/orders");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "order-1",
      commercialOfferId: listRow.commercialOfferId,
      orderNumber: "ORD-000001",
      offerNumber: "КП-000123",
    });
  });

  it("POST / returns 201 with generated number", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.order.create).mockResolvedValueOnce({
      id: "new-order",
      number: "ORD-000001",
      quoteId: null,
      orderNumber: "ORD-000001",
      items: [],
    } as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).post("/orders").send({
      quoteId: null,
      clientId: null,
      comment: null,
      items: [],
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new-order");
    expect(prisma.order.create).toHaveBeenCalled();
  });

  it("POST / returns 400 invalid_body for malformed payload", async () => {
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).post("/orders").send({
      items: "wrong-type",
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: "invalid_body",
    });
  });

  it("PATCH /:id returns 400 invalid_body for invalid status", async () => {
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).patch("/orders/order-1").send({ status: "NOT_A_STATUS" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: "invalid_body",
    });
  });

  it("PATCH /:id updates when prisma succeeds", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.update).mockResolvedValueOnce({
      id: "order-1",
      status: "CONFIRMED",
    } as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).patch("/orders/order-1").send({ status: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CONFIRMED");
  });

  it("DELETE /:id returns 204 when order is NEW", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({ status: "NEW" } as never);
    vi.mocked(prisma.order.delete).mockResolvedValueOnce({} as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).delete("/orders/order-1");
    expect(res.status).toBe(204);
  });

  it("DELETE /:id returns 404 when order missing", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).delete("/orders/order-missing");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("DELETE /:id returns 409 only_new_can_be_deleted when not NEW", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({ status: "CONFIRMED" } as never);
    const { ordersRouter } = await import("../src/routes/orders.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter);

    const res = await request(app).delete("/orders/order-1");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "only_new_can_be_deleted" });
  });
});
