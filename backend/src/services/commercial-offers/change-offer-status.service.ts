import * as Prisma from "@prisma/client";
import { createOrderFromPaidOfferIfNeeded } from "./create-order-from-paid-offer.service.js";
import {
  canTransitionStatus,
  mapStatusKeyToLegacyStatus,
  normalizeCurrentStatusKey,
  type StatusKey,
} from "../../lib/commercial-offer-status.js";

export class ChangeOfferStatusError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "invalid_current_status"
      | "illegal_status_transition",
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

type ChangeOfferStatusParams = {
  prisma: Prisma.PrismaClient;
  offerId: string;
  nextStatus: StatusKey;
  requestedOrderNumber?: string | null;
};

export async function changeCommercialOfferStatus(params: ChangeOfferStatusParams): Promise<void> {
  const { prisma, offerId, nextStatus, requestedOrderNumber } = params;
  const row = await prisma.commercialOffer.findUnique({
    where: { id: offerId },
    select: { id: true, currentStatusKey: true },
  });
  if (!row) {
    throw new ChangeOfferStatusError("not_found");
  }

  const current = normalizeCurrentStatusKey(row.currentStatusKey);
  if (!current) {
    throw new ChangeOfferStatusError("invalid_current_status", { currentStatusKey: row.currentStatusKey });
  }

  if (!canTransitionStatus(current, nextStatus)) {
    throw new ChangeOfferStatusError("illegal_status_transition", { from: current, to: nextStatus });
  }

  await prisma.$transaction(async (tx) => {
    const nextLegacyStatus = mapStatusKeyToLegacyStatus(nextStatus);
    const after = await tx.commercialOffer.update({
      where: { id: offerId },
      data: {
        currentStatusKey: nextStatus,
        status: nextLegacyStatus,
      },
      include: {
        organization: { select: { name: true, shortName: true } },
        client: { select: { lastName: true, firstName: true, patronymic: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          select: {
            lineNo: true,
            name: true,
            description: true,
            qty: true,
            unit: true,
            unitPrice: true,
            lineSum: true,
            sortOrder: true,
            imageUrl: true,
            catalogProductId: true,
          },
        },
      },
    });
    if (nextStatus !== "proposal_paid") {
      return;
    }
    await createOrderFromPaidOfferIfNeeded({
      tx,
      offer: {
        id: after.id,
        number: after.number,
        recipient: after.recipient,
        validUntil: after.validUntil,
        notes: after.notes,
        organization: after.organization,
        client: after.client,
        lines: after.lines,
      },
      requestedOrderNumber,
    });
  });
}
