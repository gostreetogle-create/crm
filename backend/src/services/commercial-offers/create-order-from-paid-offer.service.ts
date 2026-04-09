import type * as Prisma from "@prisma/client";

type OfferSnapshotForOrder = {
  id: string;
  number: string | null;
  recipient: string | null;
  validUntil: Date | null;
  notes: string | null;
  organization: { name: string; shortName: string | null } | null;
  client: { lastName: string; firstName: string; patronymic: string } | null;
  lines: Array<{
    lineNo: number;
    name: string;
    description: string | null;
    qty: number;
    unit: string;
    sortOrder: number;
  }>;
};

type CreateOrderFromPaidOfferParams = {
  tx: Prisma.Prisma.TransactionClient;
  offer: OfferSnapshotForOrder;
  requestedOrderNumber?: string | null;
};

function cleanString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function resolveOrderNumber(rawOrderNumber: string | null | undefined, offerNumber: string | null): string {
  const explicit = cleanString(rawOrderNumber);
  if (explicit) return explicit;
  const fromOffer = cleanString(offerNumber);
  if (fromOffer) return fromOffer;
  return `KP-${Date.now()}`;
}

function resolveCustomerLabel(params: {
  organization: { name: string; shortName: string | null } | null;
  client: { lastName: string; firstName: string; patronymic: string } | null;
  recipient: string | null;
}): string {
  const org = params.organization ? cleanString(params.organization.shortName) ?? params.organization.name : null;
  if (org) return org;
  if (params.client) {
    const fio = [params.client.lastName, params.client.firstName, params.client.patronymic]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    const fromClient = cleanString(fio);
    if (fromClient) return fromClient;
  }
  return cleanString(params.recipient) ?? "Не указан";
}

export async function createOrderFromPaidOfferIfNeeded(params: CreateOrderFromPaidOfferParams): Promise<void> {
  const { tx, offer, requestedOrderNumber } = params;
  const existingOrder = await tx.order.findUnique({
    where: { commercialOfferId: offer.id },
    select: { id: true },
  });
  if (existingOrder) return;

  const orderNumber = resolveOrderNumber(requestedOrderNumber, offer.number);
  const customerLabel = resolveCustomerLabel({
    organization: offer.organization,
    client: offer.client,
    recipient: offer.recipient,
  });

  try {
    await tx.order.create({
      data: {
        commercialOfferId: offer.id,
        orderNumber,
        offerNumber: cleanString(offer.number) ?? "",
        customerLabel,
        deadline: offer.validUntil,
        notes: cleanString(offer.notes),
        linesSnapshot: [...offer.lines].sort((a, b) => a.sortOrder - b.sortOrder),
      },
    });
  } catch (err: unknown) {
    // Race-safe idempotency: if another transaction created order first, treat as success.
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002") {
      return;
    }
    throw err;
  }
}
