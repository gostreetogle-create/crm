import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const organizationsRouter = Router();

const InputSchema = z.object({
  name: z.string().trim().min(2),
  shortName: z.union([z.string(), z.null(), z.undefined()]).optional(),
  legalForm: z.union([z.string(), z.null(), z.undefined()]).optional(),
  inn: z.union([z.string(), z.null(), z.undefined()]).optional(),
  kpp: z.union([z.string(), z.null(), z.undefined()]).optional(),
  ogrn: z.union([z.string(), z.null(), z.undefined()]).optional(),
  okpo: z.union([z.string(), z.null(), z.undefined()]).optional(),
  phone: z.union([z.string(), z.null(), z.undefined()]).optional(),
  email: z.union([z.string(), z.null(), z.undefined()]).optional(),
  website: z.union([z.string(), z.null(), z.undefined()]).optional(),
  legalAddress: z.union([z.string(), z.null(), z.undefined()]).optional(),
  postalAddress: z.union([z.string(), z.null(), z.undefined()]).optional(),
  bankName: z.union([z.string(), z.null(), z.undefined()]).optional(),
  bankBik: z.union([z.string(), z.null(), z.undefined()]).optional(),
  bankAccount: z.union([z.string(), z.null(), z.undefined()]).optional(),
  bankCorrAccount: z.union([z.string(), z.null(), z.undefined()]).optional(),
  signerName: z.union([z.string(), z.null(), z.undefined()]).optional(),
  signerPosition: z.union([z.string(), z.null(), z.undefined()]).optional(),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  isActive: z.boolean(),
  contactIds: z.array(z.string()).default([]),
});

function cleanString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function uniqIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.map((x) => x.trim()).filter(Boolean)));
}

function mapOrganization(row: {
  id: string;
  name: string;
  shortName: string | null;
  legalForm: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  okpo: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  legalAddress: string | null;
  postalAddress: string | null;
  bankName: string | null;
  bankBik: string | null;
  bankAccount: string | null;
  bankCorrAccount: string | null;
  signerName: string | null;
  signerPosition: string | null;
  notes: string | null;
  isActive: boolean;
  contacts: Array<{
    clientId: string;
    isPrimary: boolean;
    client: { lastName: string; firstName: string; patronymic: string };
  }>;
}) {
  const contactIds = row.contacts.map((x) => x.clientId);
  const contactLabels = row.contacts.map((x) =>
    [x.client.lastName, x.client.firstName, x.client.patronymic].map((s) => s.trim()).filter(Boolean).join(' '),
  );
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    legalForm: row.legalForm,
    inn: row.inn,
    kpp: row.kpp,
    ogrn: row.ogrn,
    okpo: row.okpo,
    phone: row.phone,
    email: row.email,
    website: row.website,
    legalAddress: row.legalAddress,
    postalAddress: row.postalAddress,
    bankName: row.bankName,
    bankBik: row.bankBik,
    bankAccount: row.bankAccount,
    bankCorrAccount: row.bankCorrAccount,
    signerName: row.signerName,
    signerPosition: row.signerPosition,
    notes: row.notes,
    isActive: row.isActive,
    contactIds,
    contactLabels,
  };
}

organizationsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        contacts: {
          include: { client: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    res.json(rows.map(mapOrganization));
  } catch (e) {
    next(e);
  }
});

organizationsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const contactIds = uniqIds(d.contactIds);
    const row = await prisma.organization.create({
      data: {
        name: d.name.trim(),
        shortName: cleanString(d.shortName),
        legalForm: cleanString(d.legalForm),
        inn: cleanString(d.inn),
        kpp: cleanString(d.kpp),
        ogrn: cleanString(d.ogrn),
        okpo: cleanString(d.okpo),
        phone: cleanString(d.phone),
        email: cleanString(d.email),
        website: cleanString(d.website),
        legalAddress: cleanString(d.legalAddress),
        postalAddress: cleanString(d.postalAddress),
        bankName: cleanString(d.bankName),
        bankBik: cleanString(d.bankBik),
        bankAccount: cleanString(d.bankAccount),
        bankCorrAccount: cleanString(d.bankCorrAccount),
        signerName: cleanString(d.signerName),
        signerPosition: cleanString(d.signerPosition),
        notes: cleanString(d.notes),
        isActive: d.isActive,
        contacts: {
          create: contactIds.map((clientId, idx) => ({ clientId, isPrimary: idx === 0 })),
        },
      },
      include: {
        contacts: {
          include: { client: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    res.status(201).json(mapOrganization(row));
  } catch (e) {
    next(e);
  }
});

organizationsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const contactIds = uniqIds(d.contactIds);
    try {
      const row = await prisma.organization.update({
        where: { id },
        data: {
          name: d.name.trim(),
          shortName: cleanString(d.shortName),
          legalForm: cleanString(d.legalForm),
          inn: cleanString(d.inn),
          kpp: cleanString(d.kpp),
          ogrn: cleanString(d.ogrn),
          okpo: cleanString(d.okpo),
          phone: cleanString(d.phone),
          email: cleanString(d.email),
          website: cleanString(d.website),
          legalAddress: cleanString(d.legalAddress),
          postalAddress: cleanString(d.postalAddress),
          bankName: cleanString(d.bankName),
          bankBik: cleanString(d.bankBik),
          bankAccount: cleanString(d.bankAccount),
          bankCorrAccount: cleanString(d.bankCorrAccount),
          signerName: cleanString(d.signerName),
          signerPosition: cleanString(d.signerPosition),
          notes: cleanString(d.notes),
          isActive: d.isActive,
          contacts: {
            deleteMany: {},
            create: contactIds.map((clientId, idx) => ({ clientId, isPrimary: idx === 0 })),
          },
        },
        include: {
          contacts: {
            include: { client: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      res.json(mapOrganization(row));
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

organizationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.organization.delete({ where: { id } });
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
