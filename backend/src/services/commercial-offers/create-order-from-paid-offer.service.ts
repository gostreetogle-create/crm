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
    unitPrice: number;
    lineSum: number;
    imageUrl?: string | null;
    catalogProductId?: string | null;
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

/** Храним в snapshot относительный путь `/media/trade-goods/...` или имя файла, без абсолютного URL. */
function normalizeImageUrlForSnapshot(raw: string | null | undefined): string | null {
  const s = cleanString(raw);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      return u.pathname;
    } catch {
      return s;
    }
  }
  return s;
}

async function resolveOrderNumber(
  tx: Prisma.Prisma.TransactionClient,
  rawOrderNumber: string | null | undefined,
): Promise<string> {
  const explicit = cleanString(rawOrderNumber);
  if (explicit) return explicit;
  const rows = await tx.order.findMany({
    select: { number: true },
    where: { number: { startsWith: "ORD-" } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  let max = 0;
  for (const row of rows) {
    const m = /^ORD-(\d+)$/.exec(String(row.number ?? "").trim());
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `ORD-${String(max + 1).padStart(6, "0")}`;
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
    where: { quoteId: offer.id },
    select: { id: true },
  });
  if (existingOrder) return;

  const orderNumber = await resolveOrderNumber(tx, requestedOrderNumber);
  const customerLabel = resolveCustomerLabel({
    organization: offer.organization,
    client: offer.client,
    recipient: offer.recipient,
  });

  try {
    const createdOrder = await tx.order.create({
      data: {
        number: orderNumber,
        quoteId: offer.id,
        status: "NEW",
        comment: cleanString(offer.notes),
        clientId: null,
        items: {
          create: [...offer.lines]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((line) => ({
              name: line.name,
              sku: null,
              quantity: line.qty,
              unit: line.unit,
              price: line.unitPrice ?? 0,
            })),
        },

        // Legacy support for production/supply modules
        commercialOfferId: offer.id,
        orderNumber,
        offerNumber: cleanString(offer.number) ?? "",
        customerLabel,
        deadline: offer.validUntil,
        notes: cleanString(offer.notes),
        linesSnapshot: [...offer.lines]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((line) => ({
            lineNo: line.lineNo,
            name: line.name,
            description: line.description,
            qty: line.qty,
            unit: line.unit,
            status: "DESIGNING",
            unitPrice: line.unitPrice,
            lineSum: line.lineSum,
            imageUrl: normalizeImageUrlForSnapshot(line.imageUrl ?? null),
            catalogProductId: cleanString(line.catalogProductId ?? null),
            sortOrder: line.sortOrder,
          })),
      },
    });
    const existingSupply = await tx.supplyRequest.findUnique({
      where: { orderId: createdOrder.id },
      select: { id: true },
    });
    if (!existingSupply) {
      await tx.supplyRequest.create({
        data: {
          orderId: createdOrder.id,
          items: {
            create: [...offer.lines]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((line) => ({
                productName: line.name,
                sku: null,
                qty: line.qty,
                unit: line.unit,
              })),
          },
        },
      });
    }
  } catch (err: unknown) {
    // Race-safe idempotency: if another transaction created order first, treat as success.
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002") {
      return;
    }
    throw err;
  }
}
