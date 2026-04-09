import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommercialOffersTestApp } from "./helpers/commercial-offers-test-app.js";
import { makeOfferForRoute } from "./helpers/commercial-offer-fixtures.js";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    commercialOffer: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../src/services/commercial-offers/change-offer-status.service.js", () => {
  class ChangeOfferStatusError extends Error {
    constructor(
      public readonly code: "not_found" | "invalid_current_status" | "illegal_status_transition",
      public readonly details?: Record<string, unknown>,
    ) {
      super(code);
    }
  }
  return {
    ChangeOfferStatusError,
    changeCommercialOfferStatus: vi.fn(),
  };
});

describe("commercialOffersRouter POST /:id/status", () => {
  const statusBody = { statusKey: "proposal_waiting" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when service throws not_found", async () => {
    const service = await import("../src/services/commercial-offers/change-offer-status.service.js");
    const { ChangeOfferStatusError } = service;
    const { changeCommercialOfferStatus } = service;
    vi.mocked(changeCommercialOfferStatus).mockRejectedValueOnce(new ChangeOfferStatusError("not_found"));
    const app = await createCommercialOffersTestApp();

    const res = await request(app).post("/offers/offer-1/status").send(statusBody);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("returns 409 with payload when service throws illegal_status_transition", async () => {
    const service = await import("../src/services/commercial-offers/change-offer-status.service.js");
    const { ChangeOfferStatusError } = service;
    const { changeCommercialOfferStatus } = service;
    vi.mocked(changeCommercialOfferStatus).mockRejectedValueOnce(
      new ChangeOfferStatusError("illegal_status_transition", {
        from: "proposal_draft",
        to: "proposal_paid",
      }),
    );

    const app = await createCommercialOffersTestApp();

    const res = await request(app).post("/offers/offer-1/status").send({ statusKey: "proposal_paid" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "illegal_status_transition",
      from: "proposal_draft",
      to: "proposal_paid",
    });
  });

  it("returns 200 and mapped offer on success", async () => {
    const service = await import("../src/services/commercial-offers/change-offer-status.service.js");
    const { changeCommercialOfferStatus } = service;
    vi.mocked(changeCommercialOfferStatus).mockResolvedValueOnce();

    const { prisma } = await import("../src/lib/prisma.js");
    vi.mocked(prisma.commercialOffer.findUnique).mockResolvedValueOnce(makeOfferForRoute() as never);

    const app = await createCommercialOffersTestApp();

    const res = await request(app).post("/offers/offer-1/status").send(statusBody);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: "offer-1",
      currentStatusKey: "proposal_waiting",
    });
  });
});
