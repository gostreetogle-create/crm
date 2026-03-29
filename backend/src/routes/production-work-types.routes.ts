import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const productionWorkTypesRouter = Router();

const InputSchema = z.object({
  name: z.string().trim().min(1),
  shortLabel: z.string().trim().min(1),
  hourlyRateRub: z.number(),
  isActive: z.boolean(),
});

function toJson(row: {
  id: string;
  name: string;
  shortLabel: string;
  hourlyRateRub: number;
  isActive: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    shortLabel: row.shortLabel,
    hourlyRateRub: row.hourlyRateRub,
    isActive: row.isActive,
  };
}

productionWorkTypesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.productionWorkType.findMany({ orderBy: { name: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

productionWorkTypesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.productionWorkType.create({ data: parsed.data });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

productionWorkTypesRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.productionWorkType.update({
        where: { id },
        data: parsed.data,
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

productionWorkTypesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.productionWorkType.delete({ where: { id } });
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
