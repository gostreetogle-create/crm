import { Router } from "express";
import { z } from "zod";
import * as Prisma from "@prisma/client";
import { syncCatalogTradeGoodsForOffer } from "../lib/commercial-offer-catalog-sync.js";
import { mapStatusKeyToLegacyStatus, normalizeCurrentStatusKey, STATUS_KEYS } from "../lib/commercial-offer-status.js";
import { prisma } from "../lib/prisma.js";
import {
  changeCommercialOfferStatus,
  ChangeOfferStatusError,
} from "../services/commercial-offers/change-offer-status.service.js";

export const commercialOffersRouter = Router();

const StatusSchema = z.nativeEnum(Prisma.CommercialOfferStatus);
const StatusKeySchema = z.enum(STATUS_KEYS);
type StatusKey = z.infer<typeof StatusKeySchema>;

const LineInputSchema = z.object({
  id: z.union([z.string().uuid(), z.null(), z.undefined()]).optional(),
  lineNo: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(500),
  description: z.union([z.string(), z.null(), z.undefined()]).optional(),
  qty: z.number().positive(),
  unit: z.string().trim().min(1).max(64),
  unitPrice: z.number().nonnegative(),
  imageUrl: z.union([z.string(), z.null(), z.undefined()]).optional(),
  catalogProductId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  sortOrder: z.number().int().optional(),
});

const InputSchema = z.object({
  number: z.union([z.string(), z.null(), z.undefined()]).optional(),
  title: z.union([z.string(), z.null(), z.undefined()]).optional(),
  status: StatusSchema.optional(),
  currentStatusKey: StatusKeySchema.optional(),
  organizationId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  clientId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  organizationContactId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  recipient: z.union([z.string(), z.null(), z.undefined()]).optional(),
  validUntil: z.union([z.string(), z.null(), z.undefined()]).optional(),
  currency: z.union([z.string(), z.null(), z.undefined()]).optional(),
  prepaymentPercent: z.union([z.number(), z.null(), z.undefined()]).optional(),
  productionLeadDays: z.union([z.number(), z.null(), z.undefined()]).optional(),
  vatPercent: z.union([z.number(), z.null(), z.undefined()]).optional(),
  vatAmount: z.union([z.number(), z.null(), z.undefined()]).optional(),
  subtotalAmount: z.union([z.number(), z.null(), z.undefined()]).optional(),
  totalAmount: z.union([z.number(), z.null(), z.undefined()]).optional(),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  skipCatalogSync: z.boolean().optional(),
  lines: z.array(LineInputSchema).optional(),
});

const StatusInputSchema = z.object({
  nextStatus: StatusKeySchema.optional(),
  statusKey: StatusKeySchema.optional(),
  orderNumber: z.union([z.string(), z.null(), z.undefined()]).optional(),
}).refine((data) => Boolean(data.nextStatus ?? data.statusKey), {
  message: "nextStatus or statusKey is required",
  path: ["nextStatus"],
});

function cleanString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function cleanOptionalId(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function parseValidUntil(v: string | null | undefined): Date | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const OFFER_NUMBER_PREFIX = "КП-";
const OFFER_NUMBER_PAD = 6;

function nextOfferNumberFromAll(numbers: Array<string | null | undefined>): string {
  let max = 0;
  for (const raw of numbers) {
    const value = cleanString(raw);
    if (!value) continue;
    const canonical = value.match(/^КП-(\d+)$/i);
    if (!canonical) continue;
    const n = Number(canonical[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${OFFER_NUMBER_PREFIX}${String(max + 1).padStart(OFFER_NUMBER_PAD, "0")}`;
}

function normalizeLineInputs(lines: z.infer<typeof LineInputSchema>[] | undefined): z.infer<typeof LineInputSchema>[] {
  const src = lines ?? [];
  return src.map((line, idx) => ({
    ...line,
    lineNo: line.lineNo ?? idx + 1,
    sortOrder: line.sortOrder ?? idx,
  }));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeAmounts(
  lines: z.infer<typeof LineInputSchema>[],
  vatPercentRaw: number | null | undefined,
  vatAmountRaw: number | null | undefined,
): { subtotalAmount: number; vatPercent: number; vatAmount: number; totalAmount: number } {
  const subtotalAmount = round2(lines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0));
  const vatPercent = Number.isFinite(vatPercentRaw as number) ? Number(vatPercentRaw) : 22;
  const vatAmountAuto = round2((subtotalAmount * vatPercent) / 100);
  const vatAmount = Number.isFinite(vatAmountRaw as number) ? round2(Number(vatAmountRaw)) : vatAmountAuto;
  const totalAmount = round2(subtotalAmount + vatAmount);
  return { subtotalAmount, vatPercent, vatAmount, totalAmount };
}

type OfferRow = {
  id: string;
  number: string | null;
  title: string | null;
  status: Prisma.CommercialOfferStatus;
  currentStatusKey: string;
  organizationId: string | null;
  clientId: string | null;
  organizationContactId: string | null;
  recipient: string | null;
  validUntil: Date | null;
  currency: string;
  prepaymentPercent: number;
  productionLeadDays: number;
  vatPercent: number;
  vatAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    shortName: string | null;
  } | null;
  client: {
    id: string;
    lastName: string;
    firstName: string;
    patronymic: string;
  } | null;
  organizationContact: {
    id: string;
    lastName: string;
    firstName: string;
    patronymic: string;
  } | null;
  lines: Array<{
    id: string;
    lineNo: number;
    name: string;
    description: string | null;
    qty: number;
    unit: string;
    unitPrice: number;
    lineSum: number;
    imageUrl: string | null;
    catalogProductId: string | null;
    sortOrder: number;
  }>;
  printEvents: Array<{
    id: string;
    printedAt: Date;
    actorUserId: string | null;
  }>;
};

type LastExtraTextsResponse = {
  extraTexts: string[];
  sourceOfferId: string | null;
  updatedAt: string | null;
};

function parseExtraTextsFromNotes(raw: string | null | undefined): string[] {
  const input = String(raw ?? "").trim();
  if (!input) return [];
  try {
    const parsed: unknown = JSON.parse(input);
    if (typeof parsed !== "object" || parsed === null) return [];
    const candidate = (parsed as { extraTexts?: unknown }).extraTexts;
    if (!Array.isArray(candidate)) return [];
    return candidate
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function mapOffer(row: OfferRow) {
  const clientLabel = row.client
    ? [row.client.lastName, row.client.firstName, row.client.patronymic]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ')
    : null;
  const organizationLabel = row.organization
    ? (row.organization.shortName?.trim() || row.organization.name)
    : null;
  const organizationContactLabel = row.organizationContact
    ? [row.organizationContact.lastName, row.organizationContact.firstName, row.organizationContact.patronymic]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ")
    : null;

  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    currentStatusKey: normalizeCurrentStatusKey(row.currentStatusKey) ?? row.currentStatusKey,
    organizationId: row.organizationId,
    clientId: row.clientId,
    organizationContactId: row.organizationContactId,
    recipient: row.recipient,
    validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    currency: row.currency,
    prepaymentPercent: row.prepaymentPercent,
    productionLeadDays: row.productionLeadDays,
    vatPercent: row.vatPercent,
    vatAmount: row.vatAmount,
    subtotalAmount: row.subtotalAmount,
    totalAmount: row.totalAmount,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    organizationLabel,
    clientLabel,
    organizationContactLabel,
    lines: [...row.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        id: l.id,
        lineNo: l.lineNo,
        name: l.name,
        description: l.description,
        qty: l.qty,
        unit: l.unit,
        unitPrice: l.unitPrice,
        lineSum: l.lineSum,
        imageUrl: l.imageUrl,
        catalogProductId: l.catalogProductId,
        sortOrder: l.sortOrder,
      })),
    printStats: {
      total: row.printEvents.length,
      lastPrintedAt: row.printEvents.length
        ? row.printEvents[row.printEvents.length - 1]!.printedAt.toISOString()
        : null,
    },
  };
}

const offerInclude = {
  organization: { select: { id: true, name: true, shortName: true } },
  client: { select: { id: true, lastName: true, firstName: true, patronymic: true } },
  organizationContact: { select: { id: true, lastName: true, firstName: true, patronymic: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      lineNo: true,
      name: true,
      description: true,
      qty: true,
      unit: true,
      unitPrice: true,
      lineSum: true,
      imageUrl: true,
      catalogProductId: true,
      sortOrder: true,
    },
  },
  printEvents: {
    orderBy: { printedAt: "asc" as const },
    select: { id: true, printedAt: true, actorUserId: true },
  },
} as const;

commercialOffersRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query["status"] === "string" ? req.query["status"].trim() : "";
    const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
    const rows = await prisma.commercialOffer.findMany({
      where: {
        ...(status ? { currentStatusKey: status } : {}),
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { notes: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: offerInclude,
    });
    res.json(rows.map((r) => mapOffer(r as OfferRow)));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.get("/last-extra-texts", async (_req, res, next) => {
  try {
    const rows = await prisma.commercialOffer.findMany({
      where: {
        notes: { not: null, contains: '"extraTexts"' },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        notes: true,
        updatedAt: true,
      },
    });
    for (const row of rows) {
      const extraTexts = parseExtraTextsFromNotes(row.notes);
      if (extraTexts.length > 0) {
        const response: LastExtraTextsResponse = {
          extraTexts,
          sourceOfferId: row.id,
          updatedAt: row.updatedAt.toISOString(),
        };
        res.json(response);
        return;
      }
    }
    const empty: LastExtraTextsResponse = {
      extraTexts: [],
      sourceOfferId: null,
      updatedAt: null,
    };
    res.json(empty);
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.post("/duplicate/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const duplicated = await prisma.$transaction(async (tx) => {
      const source = await tx.commercialOffer.findUnique({
        where: { id },
        include: {
          lines: {
            orderBy: { sortOrder: "asc" as const },
            select: {
              lineNo: true,
              name: true,
              description: true,
              qty: true,
              unit: true,
              unitPrice: true,
              imageUrl: true,
              catalogProductId: true,
              sortOrder: true,
            },
          },
        },
      });
      if (!source) return null;

      const allNumbers = await tx.commercialOffer.findMany({ select: { number: true } });
      const number = nextOfferNumberFromAll(allNumbers.map((row) => row.number));
      const currentStatusKey: StatusKey = "proposal_draft";
      const normalizedLines = normalizeLineInputs(source.lines);
      const amounts = computeAmounts(normalizedLines, undefined, undefined);

      const created = await tx.commercialOffer.create({
        data: {
          number,
          title: source.title,
          status: mapStatusKeyToLegacyStatus(currentStatusKey),
          currentStatusKey,
          organizationId: source.organizationId,
          clientId: source.clientId,
          organizationContactId: null,
          recipient: null,
          validUntil: null,
          currency: "RUB",
          prepaymentPercent: 80,
          productionLeadDays: 30,
          vatPercent: amounts.vatPercent,
          vatAmount: amounts.vatAmount,
          subtotalAmount: amounts.subtotalAmount,
          totalAmount: amounts.totalAmount,
          notes: source.notes,
          lines: {
            create: normalizedLines.map((line) => ({
              lineNo: line.lineNo!,
              name: line.name.trim(),
              description: cleanString(line.description),
              qty: line.qty,
              unit: line.unit.trim(),
              unitPrice: line.unitPrice,
              lineSum: round2(line.qty * line.unitPrice),
              imageUrl: cleanString(line.imageUrl),
              catalogProductId: cleanString(line.catalogProductId),
              sortOrder: line.sortOrder!,
            })),
          },
        },
        select: { id: true },
      });

      return tx.commercialOffer.findUniqueOrThrow({
        where: { id: created.id },
        include: offerInclude,
      });
    });
    if (!duplicated) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.status(201).json(mapOffer(duplicated as OfferRow));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await prisma.commercialOffer.findUnique({
      where: { id },
      include: offerInclude,
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapOffer(row as OfferRow));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const normalizedLines = normalizeLineInputs(d.lines);
    const amounts = computeAmounts(normalizedLines, d.vatPercent, d.vatAmount);
    const currentStatusKey = d.currentStatusKey ?? "proposal_draft";
    const row = await prisma.$transaction(async (tx) => {
      const inputNumber = cleanString(d.number);
      let numberToSave = inputNumber;
      if (!numberToSave) {
        const allNumbers = await tx.commercialOffer.findMany({
          select: { number: true },
        });
        numberToSave = nextOfferNumberFromAll(allNumbers.map((row) => row.number));
      }
      const created = await tx.commercialOffer.create({
        data: {
          number: numberToSave,
          title: cleanString(d.title),
          status: d.status ?? mapStatusKeyToLegacyStatus(currentStatusKey),
          currentStatusKey,
          organizationId: cleanOptionalId(d.organizationId),
          clientId: cleanOptionalId(d.clientId),
          organizationContactId: cleanOptionalId(d.organizationContactId),
          recipient: cleanString(d.recipient),
          validUntil: parseValidUntil(d.validUntil),
          currency: cleanString(d.currency)?.toUpperCase() ?? "RUB",
          prepaymentPercent: Number.isFinite(d.prepaymentPercent as number)
            ? Number(d.prepaymentPercent)
            : 80,
          productionLeadDays: Number.isFinite(d.productionLeadDays as number)
            ? Math.max(0, Math.trunc(Number(d.productionLeadDays)))
            : 30,
          vatPercent: amounts.vatPercent,
          vatAmount: amounts.vatAmount,
          subtotalAmount: amounts.subtotalAmount,
          totalAmount: amounts.totalAmount,
          notes: cleanString(d.notes),
          lines: {
            create: normalizedLines.map((line) => ({
              lineNo: line.lineNo!,
              name: line.name.trim(),
              description: cleanString(line.description),
              qty: line.qty,
              unit: line.unit.trim(),
              unitPrice: line.unitPrice,
              lineSum: round2(line.qty * line.unitPrice),
              imageUrl: cleanString(line.imageUrl),
              catalogProductId: cleanString(line.catalogProductId),
              sortOrder: line.sortOrder!,
            })),
          },
        },
        select: { id: true },
      });
      if (!d.skipCatalogSync) {
        await syncCatalogTradeGoodsForOffer(tx, created.id);
      }
      return tx.commercialOffer.findUniqueOrThrow({
        where: { id: created.id },
        include: offerInclude,
      });
    });
    res.status(201).json(mapOffer(row as OfferRow));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    if (d.currentStatusKey !== undefined) {
      res.status(422).json({
        error: "direct_status_change_forbidden",
        message: "Нельзя менять currentStatusKey через PUT /commercial-offers/:id. Используйте POST /commercial-offers/:id/status.",
      });
      return;
    }
    const normalizedLines = d.lines !== undefined ? normalizeLineInputs(d.lines) : undefined;
    try {
      const row = await prisma.$transaction(async (tx) => {
        const existing = await tx.commercialOffer.findUnique({ where: { id } });
        if (!existing) {
          return null;
        }
        if (existing.currentStatusKey === "proposal_paid") {
          throw new Error("paid_offer_locked");
        }
        const amounts = computeAmounts(
          normalizedLines ?? [],
          d.vatPercent ?? existing.vatPercent,
          d.vatAmount ?? existing.vatAmount,
        );
        if (normalizedLines) {
          await tx.commercialOfferLine.deleteMany({ where: { commercialOfferId: id } });
        }
        await tx.commercialOffer.update({
          where: { id },
          data: {
            ...(d.number !== undefined ? { number: cleanString(d.number) } : {}),
            ...(d.title !== undefined ? { title: cleanString(d.title) } : {}),
            ...(d.status !== undefined ? { status: d.status } : {}),
            ...(d.organizationId !== undefined ? { organizationId: cleanOptionalId(d.organizationId) } : {}),
            ...(d.clientId !== undefined ? { clientId: cleanOptionalId(d.clientId) } : {}),
            ...(d.organizationContactId !== undefined
              ? { organizationContactId: cleanOptionalId(d.organizationContactId) }
              : {}),
            ...(d.recipient !== undefined ? { recipient: cleanString(d.recipient) } : {}),
            ...(d.validUntil !== undefined ? { validUntil: parseValidUntil(d.validUntil) } : {}),
            ...(d.currency !== undefined ? { currency: cleanString(d.currency)?.toUpperCase() ?? "RUB" } : {}),
            ...(d.prepaymentPercent !== undefined
              ? {
                  prepaymentPercent: Number.isFinite(d.prepaymentPercent as number)
                    ? Number(d.prepaymentPercent)
                    : 80,
                }
              : {}),
            ...(d.productionLeadDays !== undefined
              ? {
                  productionLeadDays: Number.isFinite(d.productionLeadDays as number)
                    ? Math.max(0, Math.trunc(Number(d.productionLeadDays)))
                    : 30,
                }
              : {}),
            ...(d.vatPercent !== undefined ? { vatPercent: amounts.vatPercent } : {}),
            ...(d.vatAmount !== undefined ? { vatAmount: amounts.vatAmount } : {}),
            ...(d.subtotalAmount !== undefined || normalizedLines !== undefined
              ? { subtotalAmount: amounts.subtotalAmount }
              : {}),
            ...(d.totalAmount !== undefined || normalizedLines !== undefined
              ? { totalAmount: amounts.totalAmount }
              : {}),
            ...(d.notes !== undefined ? { notes: cleanString(d.notes) } : {}),
            ...(normalizedLines
              ? {
                  lines: {
                    create: normalizedLines.map((line) => ({
                      lineNo: line.lineNo!,
                      name: line.name.trim(),
                      description: cleanString(line.description),
                      qty: line.qty,
                      unit: line.unit.trim(),
                      unitPrice: line.unitPrice,
                      lineSum: round2(line.qty * line.unitPrice),
                      imageUrl: cleanString(line.imageUrl),
                      catalogProductId: cleanString(line.catalogProductId),
                      sortOrder: line.sortOrder!,
                    })),
                  },
                }
              : {}),
          },
        });
        if (!d.skipCatalogSync) {
          await syncCatalogTradeGoodsForOffer(tx, id);
        }
        return tx.commercialOffer.findUniqueOrThrow({
          where: { id },
          include: offerInclude,
        });
      });
      if (!row) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(mapOffer(row as OfferRow));
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "paid_offer_locked") {
        res.status(409).json({ error: "paid_offer_locked" });
        return;
      }
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.post("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = StatusInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const nextStatus = parsed.data.nextStatus ?? parsed.data.statusKey!;
    try {
      await changeCommercialOfferStatus({
        prisma,
        offerId: id,
        nextStatus,
        requestedOrderNumber: parsed.data.orderNumber ?? null,
      });
    } catch (err: unknown) {
      if (err instanceof ChangeOfferStatusError) {
        if (err.code === "not_found") {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.status(409).json({ error: err.code, ...(err.details ?? {}) });
        return;
      }
      throw err;
    }
    const updated = await prisma.commercialOffer.findUnique({
      where: { id },
      include: offerInclude,
    });
    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapOffer(updated as OfferRow));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.post("/:id/print", async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await prisma.commercialOffer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!offer) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const actorUserId = req.auth?.userId ?? null;
    const event = await prisma.commercialOfferPrintEvent.create({
      data: {
        commercialOfferId: id,
        actorUserId,
      },
    });
    res.status(201).json({ ok: true, printedAt: event.printedAt.toISOString() });
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      const offer = await prisma.commercialOffer.findUnique({
        where: { id },
        select: {
          currentStatusKey: true,
          orders: {
            select: {
              id: true,
              number: true,
              orderNumber: true,
            },
            take: 1,
          },
        },
      });
      if (!offer) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const linkedOrder = offer.orders[0] ?? null;
      if (linkedOrder) {
        res.status(409).json({
          error: "offer_has_order",
          message:
            "Для этого КП уже создан заказ. Сначала удалите заказ, затем коммерческое предложение.",
          order: {
            id: linkedOrder.id,
            number: linkedOrder.number || linkedOrder.orderNumber,
          },
        });
        return;
      }
      if (offer.currentStatusKey === "proposal_paid") {
        res.status(409).json({ error: "paid_offer_locked" });
        return;
      }
      await prisma.commercialOffer.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
