import { describe, expect, it, vi } from "vitest";
import { createOrderFromPaidOfferIfNeeded } from "../src/services/commercial-offers/create-order-from-paid-offer.service.js";

describe("createOrderFromPaidOfferIfNeeded", () => {
  const offer = {
    id: "offer-1",
    number: "КП-000123",
    recipient: "ООО Ромашка",
    validUntil: null,
    notes: "test",
    organization: null,
    client: null,
    lines: [
      {
        lineNo: 1,
        name: "Товар 1",
        description: null,
        qty: 2,
        unit: "шт",
        sortOrder: 0,
      },
    ],
  };

  it("creates order when no existing order", async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "order-1" }),
      },
    };

    await createOrderFromPaidOfferIfNeeded({
      tx: tx as never,
      offer,
      requestedOrderNumber: null,
    });

    expect(tx.order.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commercialOfferId: offer.id,
          offerNumber: offer.number,
        }),
      }),
    );
  });

  it("does not create duplicate order", async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue({ id: "existing-order" }),
        create: vi.fn(),
      },
    };

    await createOrderFromPaidOfferIfNeeded({
      tx: tx as never,
      offer,
      requestedOrderNumber: "ORDER-001",
    });

    expect(tx.order.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("treats P2002 on create as race-safe success", async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue({ code: "P2002" }),
      },
    };

    await expect(
      createOrderFromPaidOfferIfNeeded({
        tx: tx as never,
        offer,
        requestedOrderNumber: "ORDER-002",
      }),
    ).resolves.toBeUndefined();

    expect(tx.order.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
  });
});
