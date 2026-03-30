import { Router } from 'express';
import { z } from 'zod';
import { CommercialOfferStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const commercialOffersRouter = Router();

const StatusSchema = z.nativeEnum(CommercialOfferStatus);

const InputSchema = z.object({
  number: z.union([z.string(), z.null(), z.undefined()]).optional(),
  title: z.union([z.string(), z.null(), z.undefined()]).optional(),
  status: StatusSchema.optional(),
  organizationId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  clientId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  validUntil: z.union([z.string(), z.null(), z.undefined()]).optional(),
  currency: z.union([z.string(), z.null(), z.undefined()]).optional(),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
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

type OfferRow = {
  id: string;
  number: string | null;
  title: string | null;
  status: CommercialOfferStatus;
  organizationId: string | null;
  clientId: string | null;
  validUntil: Date | null;
  currency: string;
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

  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    organizationId: row.organizationId,
    clientId: row.clientId,
    validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    currency: row.currency,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    organizationLabel,
    clientLabel,
  };
}

const offerInclude = {
  organization: { select: { id: true, name: true, shortName: true } },
  client: { select: { id: true, lastName: true, firstName: true, patronymic: true } },
} as const;

commercialOffersRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.commercialOffer.findMany({
      orderBy: { createdAt: 'desc' },
      include: offerInclude,
    });
    res.json(rows.map((r) => mapOffer(r as OfferRow)));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const row = await prisma.commercialOffer.create({
      data: {
        number: cleanString(d.number),
        title: cleanString(d.title),
        status: d.status ?? CommercialOfferStatus.DRAFT,
        organizationId: cleanOptionalId(d.organizationId),
        clientId: cleanOptionalId(d.clientId),
        validUntil: parseValidUntil(d.validUntil),
        currency: cleanString(d.currency)?.toUpperCase() ?? 'RUB',
        notes: cleanString(d.notes),
      },
      include: offerInclude,
    });
    res.status(201).json(mapOffer(row as OfferRow));
  } catch (e) {
    next(e);
  }
});

commercialOffersRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    try {
      const row = await prisma.commercialOffer.update({
        where: { id },
        data: {
          ...(d.number !== undefined ? { number: cleanString(d.number) } : {}),
          ...(d.title !== undefined ? { title: cleanString(d.title) } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.organizationId !== undefined ? { organizationId: cleanOptionalId(d.organizationId) } : {}),
          ...(d.clientId !== undefined ? { clientId: cleanOptionalId(d.clientId) } : {}),
          ...(d.validUntil !== undefined ? { validUntil: parseValidUntil(d.validUntil) } : {}),
          ...(d.currency !== undefined
            ? { currency: cleanString(d.currency)?.toUpperCase() ?? 'RUB' }
            : {}),
          ...(d.notes !== undefined ? { notes: cleanString(d.notes) } : {}),
        },
        include: offerInclude,
      });
      res.json(mapOffer(row as OfferRow));
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

commercialOffersRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
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
