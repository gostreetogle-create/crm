import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const geometriesRouter = Router();

const InputSchema = z.object({
  name: z.string().trim().min(1),
  shapeKey: z.string().trim().min(1),
  heightMm: z.number().optional(),
  lengthMm: z.number().optional(),
  widthMm: z.number().optional(),
  diameterMm: z.number().optional(),
  thicknessMm: z.number().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean(),
});

function toJson(row: {
  id: string;
  name: string;
  shapeKey: string;
  heightMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  diameterMm: number | null;
  thicknessMm: number | null;
  notes: string | null;
  isActive: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    shapeKey: row.shapeKey,
    ...(row.heightMm != null ? { heightMm: row.heightMm } : {}),
    ...(row.lengthMm != null ? { lengthMm: row.lengthMm } : {}),
    ...(row.widthMm != null ? { widthMm: row.widthMm } : {}),
    ...(row.diameterMm != null ? { diameterMm: row.diameterMm } : {}),
    ...(row.thicknessMm != null ? { thicknessMm: row.thicknessMm } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    isActive: row.isActive,
  };
}

function createData(p: z.infer<typeof InputSchema>) {
  return {
    name: p.name,
    shapeKey: p.shapeKey,
    heightMm: p.heightMm ?? null,
    lengthMm: p.lengthMm ?? null,
    widthMm: p.widthMm ?? null,
    diameterMm: p.diameterMm ?? null,
    thicknessMm: p.thicknessMm ?? null,
    notes: p.notes?.length ? p.notes : null,
    isActive: p.isActive,
  };
}

geometriesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.geometry.findMany({ orderBy: { name: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

geometriesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.geometry.create({ data: createData(parsed.data) });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

geometriesRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.geometry.update({
        where: { id },
        data: createData(parsed.data),
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

geometriesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.geometry.delete({ where: { id } });
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
