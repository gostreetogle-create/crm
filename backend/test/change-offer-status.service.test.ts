import { describe, expect, it, vi } from "vitest";
import {
  changeCommercialOfferStatus,
  ChangeOfferStatusError,
} from "../src/services/commercial-offers/change-offer-status.service.js";

function makePrismaMock(currentStatusKey: string | null) {
  const tx = {
    commercialOffer: {
      update: vi.fn().mockResolvedValue({
        id: "offer-1",
        number: "КП-000321",
        recipient: "ООО Тест",
        validUntil: null,
        notes: null,
        organization: null,
        client: null,
        lines: [
          {
            lineNo: 1,
            name: "Позиция",
            description: null,
            qty: 1,
            unit: "шт",
            sortOrder: 0,
          },
        ],
      }),
    },
    order: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "order-1" }),
    },
  };

  const prisma = {
    commercialOffer: {
      findUnique: vi.fn().mockResolvedValue(
        currentStatusKey == null ? null : { id: "offer-1", currentStatusKey },
      ),
    },
    $transaction: vi.fn().mockImplementation(async (cb: (innerTx: typeof tx) => Promise<void>) => cb(tx)),
  };

  return { prisma, tx };
}

describe("changeCommercialOfferStatus", () => {
  it("throws not_found when offer does not exist", async () => {
    const { prisma } = makePrismaMock(null);
    await expect(
      changeCommercialOfferStatus({
        prisma: prisma as never,
        offerId: "missing",
        nextStatus: "proposal_waiting",
      }),
    ).rejects.toMatchObject<Partial<ChangeOfferStatusError>>({ code: "not_found" });
  });

  it("throws invalid_current_status for unknown status key", async () => {
    const { prisma } = makePrismaMock("unexpected_status");
    await expect(
      changeCommercialOfferStatus({
        prisma: prisma as never,
        offerId: "offer-1",
        nextStatus: "proposal_waiting",
      }),
    ).rejects.toMatchObject<Partial<ChangeOfferStatusError>>({ code: "invalid_current_status" });
  });

  it.each([
    ["proposal_draft", "proposal_paid"],
    ["proposal_paid", "proposal_waiting"],
    ["proposal_paid", "proposal_draft"],
  ] as const)(
    "throws illegal_status_transition for %s -> %s",
    async (from, to) => {
      const { prisma } = makePrismaMock(from);
      await expect(
        changeCommercialOfferStatus({
          prisma: prisma as never,
          offerId: "offer-1",
          nextStatus: to,
        }),
      ).rejects.toMatchObject<Partial<ChangeOfferStatusError>>({ code: "illegal_status_transition" });
    },
  );

  it.each([
    ["proposal_draft", "proposal_waiting"],
    ["proposal_waiting", "proposal_draft"],
    ["proposal_approved", "proposal_draft"],
  ] as const)(
    "updates status for valid transition %s -> %s without order creation",
    async (from, to) => {
      const { prisma, tx } = makePrismaMock(from);
      await changeCommercialOfferStatus({
        prisma: prisma as never,
        offerId: "offer-1",
        nextStatus: to,
      });

      expect(tx.commercialOffer.update).toHaveBeenCalledTimes(1);
      expect(tx.order.create).not.toHaveBeenCalled();
    },
  );

  it("treats legacy approved as waiting and allows paid transition", async () => {
    const { prisma, tx } = makePrismaMock("proposal_approved");
    await changeCommercialOfferStatus({
      prisma: prisma as never,
      offerId: "offer-1",
      nextStatus: "proposal_paid",
      orderNumber: "ORD-LEGACY-1",
    });

    expect(tx.commercialOffer.update).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commercialOfferId: "offer-1",
          orderNumber: "ORD-LEGACY-1",
        }),
      }),
    );
  });

  it("creates order on waiting -> paid transition", async () => {
    const { prisma, tx } = makePrismaMock("proposal_waiting");
    await changeCommercialOfferStatus({
      prisma: prisma as never,
      offerId: "offer-1",
      nextStatus: "proposal_paid",
      orderNumber: "ORD-77",
    });

    expect(tx.commercialOffer.update).toHaveBeenCalledTimes(1);
    expect(tx.order.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commercialOfferId: "offer-1",
          orderNumber: "ORD-77",
        }),
      }),
    );
  });

  it("is race-safe for pseudo-concurrent paid transitions", async () => {
    const tx = {
      commercialOffer: {
        update: vi.fn().mockResolvedValue({
          id: "offer-1",
          number: "КП-000321",
          recipient: "ООО Тест",
          validUntil: null,
          notes: null,
          organization: null,
          client: null,
          lines: [
            {
              lineNo: 1,
              name: "Позиция",
              description: null,
              qty: 1,
              unit: "шт",
              sortOrder: 0,
            },
          ],
        }),
      },
      order: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: "order-1" })
          .mockRejectedValueOnce({ code: "P2002" }),
      },
    };

    const prisma = {
      commercialOffer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "offer-1",
          currentStatusKey: "proposal_waiting",
        }),
      },
      $transaction: vi.fn().mockImplementation(async (cb: (innerTx: typeof tx) => Promise<void>) => cb(tx)),
    };

    await expect(
      Promise.all([
        changeCommercialOfferStatus({
          prisma: prisma as never,
          offerId: "offer-1",
          nextStatus: "proposal_paid",
        }),
        changeCommercialOfferStatus({
          prisma: prisma as never,
          offerId: "offer-1",
          nextStatus: "proposal_paid",
        }),
      ]),
    ).resolves.toHaveLength(2);
  });
});
