import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const clientsRouter = Router();

function optionalIsoDateString() {
  return z
    .string()
    .refine((v) => {
      const s = String(v ?? '').trim();
      return s.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(s);
    }, 'invalid_date_format');
}

function optionalNumericString(regex: RegExp) {
  return z
    .string()
    .refine((v) => {
      const s = String(v ?? '').trim();
      return s.length === 0 || regex.test(s);
    }, 'invalid_numeric_format');
}

const InputSchema = z.object({
  lastName: z.string(),
  firstName: z.string(),
  patronymic: z.string(),
  phone: z.string(),
  address: z.string(),
  email: z.string(),
  notes: z.string(),
  clientMarkupPercent: z.number().nullable(),
  isActive: z.boolean(),
  passportSeries: optionalNumericString(/^\d{4}$/),
  passportNumber: optionalNumericString(/^\d{6}$/),
  passportIssuedBy: z.string(),
  passportIssuedDate: optionalIsoDateString(),
});

function toJson(row: {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
  clientMarkupPercent: number | null;
  isActive: boolean;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
}) {
  return {
    id: row.id,
    lastName: row.lastName,
    firstName: row.firstName,
    patronymic: row.patronymic,
    phone: row.phone,
    address: row.address,
    email: row.email,
    notes: row.notes,
    clientMarkupPercent: row.clientMarkupPercent,
    isActive: row.isActive,
    passportSeries: row.passportSeries,
    passportNumber: row.passportNumber,
    passportIssuedBy: row.passportIssuedBy,
    passportIssuedDate: row.passportIssuedDate,
  };
}

clientsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.client.findMany({ orderBy: { lastName: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

clientsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const row = await prisma.client.create({
      data: {
        lastName: d.lastName,
        firstName: d.firstName,
        patronymic: d.patronymic,
        phone: d.phone,
        address: d.address,
        email: d.email,
        notes: d.notes ?? '',
        clientMarkupPercent: d.clientMarkupPercent,
        isActive: d.isActive,
        passportSeries: d.passportSeries ?? '',
        passportNumber: d.passportNumber ?? '',
        passportIssuedBy: d.passportIssuedBy ?? '',
        passportIssuedDate: d.passportIssuedDate ?? '',
      },
    });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

clientsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    try {
      const row = await prisma.client.update({
        where: { id },
        data: {
          lastName: d.lastName,
          firstName: d.firstName,
          patronymic: d.patronymic,
          phone: d.phone,
          address: d.address,
          email: d.email,
          notes: d.notes ?? '',
          clientMarkupPercent: d.clientMarkupPercent,
          isActive: d.isActive,
          passportSeries: d.passportSeries ?? '',
          passportNumber: d.passportNumber ?? '',
          passportIssuedBy: d.passportIssuedBy ?? '',
          passportIssuedDate: d.passportIssuedDate ?? '',
        },
      });
      res.json(toJson(row));
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

clientsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.client.delete({ where: { id } });
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
