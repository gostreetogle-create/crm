import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const surfaceFinishesRouter = Router();

const InputSchema = z.object({
  finishType: z.string().trim().min(1),
  roughnessClass: z.string().trim().min(1),
  raMicron: z.number().optional(),
});

function toJson(row: {
  id: string;
  finishType: string;
  roughnessClass: string;
  raMicron: number | null;
}) {
  return {
    id: row.id,
    finishType: row.finishType,
    roughnessClass: row.roughnessClass,
    ...(row.raMicron != null ? { raMicron: row.raMicron } : {}),
  };
}

surfaceFinishesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.surfaceFinish.findMany({ orderBy: { finishType: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

surfaceFinishesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.surfaceFinish.create({ data: parsed.data });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

surfaceFinishesRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.surfaceFinish.update({ where: { id }, data: parsed.data });
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

surfaceFinishesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.surfaceFinish.delete({ where: { id } });
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
