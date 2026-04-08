import { Router } from "express";
import { z } from "zod";
import * as Prisma from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const commercialOffersRouter = Router();

const StatusSchema = z.nativeEnum(Prisma.CommercialOfferStatus);
const STATUS_KEYS = [
  "proposal_draft",
  "proposal_waiting",
  "proposal_approved",
  "proposal_paid",
] as const;
const StatusKeySchema = z.enum(STATUS_KEYS);
type StatusKey = z.infer<typeof StatusKeySchema>;

const ALLOWED_TRANSITIONS: Record<StatusKey, readonly StatusKey[]> = {
  proposal_draft: ["proposal_waiting"],
  proposal_waiting: ["proposal_approved", "proposal_draft"],
  proposal_approved: ["proposal_paid", "proposal_waiting"],
  proposal_paid: [],
};

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
  vatPercent: z.union([z.number(), z.null(), z.undefined()]).optional(),
  vatAmount: z.union([z.number(), z.null(), z.undefined()]).optional(),
  subtotalAmount: z.union([z.number(), z.null(), z.undefined()]).optional(),
  totalAmount: z.union([z.number(), z.null(), z.undefined()]).optional(),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  lines: z.array(LineInputSchema).optional(),
});

const StatusInputSchema = z.object({
  statusKey: StatusKeySchema,
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

function mapStatusKeyToLegacyStatus(key: StatusKey): Prisma.CommercialOfferStatus {
  if (key === "proposal_draft") return Prisma.CommercialOfferStatus.DRAFT;
  if (key === "proposal_waiting") return Prisma.CommercialOfferStatus.SENT;
  if (key === "proposal_approved") return Prisma.CommercialOfferStatus.ACCEPTED;
  return Prisma.CommercialOfferStatus.ACCEPTED;
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
    currentStatusKey: row.currentStatusKey,
    organizationId: row.organizationId,
    clientId: row.clientId,
    organizationContactId: row.organizationContactId,
    recipient: row.recipient,
    validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    currency: row.currency,
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
      return tx.commercialOffer.create({
        data: {
          number: cleanString(d.number),
          title: cleanString(d.title),
          status: d.status ?? mapStatusKeyToLegacyStatus(currentStatusKey),
          currentStatusKey,
          organizationId: cleanOptionalId(d.organizationId),
          clientId: cleanOptionalId(d.clientId),
          organizationContactId: cleanOptionalId(d.organizationContactId),
          recipient: cleanString(d.recipient),
          validUntil: parseValidUntil(d.validUntil),
          currency: cleanString(d.currency)?.toUpperCase() ?? "RUB",
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
        return tx.commercialOffer.update({
          where: { id },
          data: {
            ...(d.number !== undefined ? { number: cleanString(d.number) } : {}),
            ...(d.title !== undefined ? { title: cleanString(d.title) } : {}),
            ...(d.status !== undefined ? { status: d.status } : {}),
            ...(d.currentStatusKey !== undefined
              ? {
                  currentStatusKey: d.currentStatusKey,
                  status: mapStatusKeyToLegacyStatus(d.currentStatusKey),
                }
              : {}),
            ...(d.organizationId !== undefined ? { organizationId: cleanOptionalId(d.organizationId) } : {}),
            ...(d.clientId !== undefined ? { clientId: cleanOptionalId(d.clientId) } : {}),
            ...(d.organizationContactId !== undefined
              ? { organizationContactId: cleanOptionalId(d.organizationContactId) }
              : {}),
            ...(d.recipient !== undefined ? { recipient: cleanString(d.recipient) } : {}),
            ...(d.validUntil !== undefined ? { validUntil: parseValidUntil(d.validUntil) } : {}),
            ...(d.currency !== undefined ? { currency: cleanString(d.currency)?.toUpperCase() ?? "RUB" } : {}),
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
    const nextStatus = parsed.data.statusKey;
    const row = await prisma.commercialOffer.findUnique({
      where: { id },
      select: { id: true, currentStatusKey: true },
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const current = row.currentStatusKey as StatusKey;
    if (!STATUS_KEYS.includes(current)) {
      res.status(409).json({ error: "invalid_current_status", currentStatusKey: row.currentStatusKey });
      return;
    }
    if (!ALLOWED_TRANSITIONS[current].includes(nextStatus)) {
      res.status(409).json({ error: "illegal_status_transition", from: current, to: nextStatus });
      return;
    }
    const updated = await prisma.commercialOffer.update({
      where: { id },
      data: {
        currentStatusKey: nextStatus,
        status: mapStatusKeyToLegacyStatus(nextStatus),
      },
      include: offerInclude,
    });
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
        select: { currentStatusKey: true },
      });
      if (!offer) {
        res.status(404).json({ error: "not_found" });
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
