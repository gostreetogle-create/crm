import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const coatingsRouter = Router();

const InputSchema = z.object({
  coatingType: z.string().trim().min(1),
  coatingSpec: z.string().trim().min(1),
  thicknessMicron: z.number().optional(),
});

function toJson(row: {
  id: string;
  coatingType: string;
  coatingSpec: string;
  thicknessMicron: number | null;
}) {
  return {
    id: row.id,
    coatingType: row.coatingType,
    coatingSpec: row.coatingSpec,
    ...(row.thicknessMicron != null ? { thicknessMicron: row.thicknessMicron } : {}),
  };
}

coatingsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.coating.findMany({ orderBy: { coatingType: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

coatingsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.coating.create({ data: parsed.data });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

coatingsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.coating.update({ where: { id }, data: parsed.data });
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

coatingsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.coating.delete({ where: { id } });
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
