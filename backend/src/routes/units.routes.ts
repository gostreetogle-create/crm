import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const unitsRouter = Router();

const UnitInputSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean(),
});

type UnitRow = {
  id: string;
  name: string;
  code: string | null;
  notes: string | null;
  isActive: boolean;
};

function toJson(row: UnitRow) {
  return {
    id: row.id,
    name: row.name,
    ...(row.code ? { code: row.code } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    isActive: row.isActive,
  };
}

unitsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

unitsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = UnitInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { name, code, notes, isActive } = parsed.data;
    const row = await prisma.unit.create({
      data: {
        name,
        code: code?.length ? code : null,
        notes: notes?.length ? notes : null,
        isActive,
      },
    });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

unitsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = UnitInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { name, code, notes, isActive } = parsed.data;
    try {
      const row = await prisma.unit.update({
        where: { id },
        data: {
          name,
          code: code?.length ? code : null,
          notes: notes?.length ? notes : null,
          isActive,
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

unitsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.unit.delete({ where: { id } });
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
