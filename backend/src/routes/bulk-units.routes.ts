import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const bulkUnitsRouter = Router();

const BulkUnitItemSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

const BulkUnitsBodySchema = z.object({
  items: z.array(BulkUnitItemSchema).min(1).max(5000),
});

bulkUnitsRouter.post('/units', async (req, res, next) => {
  try {
    const parsed = BulkUnitsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      try {
        const row = await prisma.unit.create({
          data: {
            name: it.name,
            code: it.code?.length ? it.code : null,
            notes: it.notes?.length ? it.notes : null,
            isActive: it.isActive ?? true,
          },
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'create_failed';
        errors.push({ index: i, message });
      }
    }

    res.json({
      ok: errors.length === 0,
      created,
      errors,
    });
  } catch (e) {
    next(e);
  }
});
