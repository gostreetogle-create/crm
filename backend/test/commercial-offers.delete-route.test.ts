import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommercialOffersTestApp } from "./helpers/commercial-offers-test-app.js";
import { makeOfferDeleteProbe } from "./helpers/commercial-offer-fixtures.js";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    commercialOffer: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("commercialOffersRouter DELETE /:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when offer not found", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.commercialOffer.findUnique).mockResolvedValueOnce(null);
    const app = await createCommercialOffersTestApp();

    const res = await request(app).delete("/offers/offer-missing");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("returns 409 offer_has_order with order payload", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.commercialOffer.findUnique).mockResolvedValueOnce(
      makeOfferDeleteProbe({
        currentStatusKey: "proposal_waiting",
        order: { id: "order-1", orderNumber: "ORD-100" },
      }) as never,
    );
    const app = await createCommercialOffersTestApp();

    const res = await request(app).delete("/offers/offer-1");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "offer_has_order",
      message: "Для этого КП уже создан заказ. Сначала удалите заказ, затем коммерческое предложение.",
      order: {
        id: "order-1",
        number: "ORD-100",
      },
    });
  });

  it("returns 409 paid_offer_locked for paid offer", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.commercialOffer.findUnique).mockResolvedValueOnce(
      makeOfferDeleteProbe({ currentStatusKey: "proposal_paid" }) as never,
    );
    const app = await createCommercialOffersTestApp();

    const res = await request(app).delete("/offers/offer-1");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "paid_offer_locked" });
  });

  it("returns 204 and deletes offer when allowed", async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.commercialOffer.findUnique).mockResolvedValueOnce(makeOfferDeleteProbe() as never);
    vi.mocked(prisma.commercialOffer.delete).mockResolvedValueOnce({ id: "offer-1" } as never);
    const app = await createCommercialOffersTestApp();

    const res = await request(app).delete("/offers/offer-1");
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect(prisma.commercialOffer.delete).toHaveBeenCalledWith({ where: { id: "offer-1" } });
  });
});
