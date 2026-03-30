import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { clearColorSnapshots, propagateColorSnapshots } from '../lib/material-characteristics-snapshots.propagate.js';

export const colorsRouter = Router();

const RgbSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
});

const ColorInputSchema = z.object({
  ralCode: z.string().trim().optional(),
  name: z.string().trim().min(1),
  hex: z.string().trim().min(1),
  rgb: RgbSchema,
});

function toJson(row: {
  id: string;
  ralCode: string | null;
  name: string;
  hex: string;
  rgbR: number;
  rgbG: number;
  rgbB: number;
}) {
  return {
    id: row.id,
    ...(row.ralCode ? { ralCode: row.ralCode } : {}),
    name: row.name,
    hex: row.hex,
    rgb: { r: row.rgbR, g: row.rgbG, b: row.rgbB },
  };
}

colorsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.color.findMany({ orderBy: { name: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

colorsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = ColorInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { ralCode, name, hex, rgb } = parsed.data;
    const row = await prisma.color.create({
      data: {
        ralCode: ralCode?.length ? ralCode : null,
        name,
        hex,
        rgbR: rgb.r,
        rgbG: rgb.g,
        rgbB: rgb.b,
      },
    });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

colorsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const raw = req.query.propagation;
    const propagation = Array.isArray(raw) ? raw[0] : raw;
    const mode = propagation === 'global' ? 'global' : 'local';
    const parsed = ColorInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { ralCode, name, hex, rgb } = parsed.data;
    try {
      const row = await prisma.color.update({
        where: { id },
        data: {
          ralCode: ralCode?.length ? ralCode : null,
          name,
          hex,
          rgbR: rgb.r,
          rgbG: rgb.g,
          rgbB: rgb.b,
        },
      });

      if (mode === 'global') {
        await propagateColorSnapshots(prisma, {
          colorId: id,
          colorName: row.name,
          colorHex: row.hex,
        });
      }

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

colorsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const raw = req.query.propagation;
    const propagation = Array.isArray(raw) ? raw[0] : raw;
    const mode = propagation === 'global' ? 'global' : 'local';
    try {
      if (mode === 'global') {
        await prisma.$transaction(async (tx) => {
          await clearColorSnapshots(tx, id);
          await tx.color.delete({ where: { id } });
        });
      } else {
        await prisma.color.delete({ where: { id } });
      }
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
