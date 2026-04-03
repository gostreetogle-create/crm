import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/** Чтение списка ролей — любой авторизованный пользователь (UI, матрица прав). */
export const rolesReadRouter = Router();

/** Создание/изменение/удаление — только админ (как раньше под `requireAdmin`). */
export const rolesWriteRouter = Router();

const InputSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sortOrder: z.number().int(),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  isActive: z.boolean(),
  isSystem: z.boolean().optional(),
});

function toJson(row: {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  notes: string | null;
  isActive: boolean;
  isSystem: boolean;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sortOrder,
    ...(row.notes ? { notes: row.notes } : {}),
    isActive: row.isActive,
    isSystem: row.isSystem,
  };
}

function dataFromParsed(p: z.infer<typeof InputSchema>) {
  return {
    /** Единый регистр с каноном `DEFAULT_ROLE_PERMISSIONS_BY_CODE` на фронте. */
    code: p.code.toLowerCase(),
    name: p.name,
    sortOrder: p.sortOrder,
    notes: p.notes != null && String(p.notes).trim() ? String(p.notes).trim() : null,
    isActive: p.isActive,
    isSystem: p.isSystem ?? false,
  };
}

rolesReadRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.role.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

rolesWriteRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.role.create({ data: dataFromParsed(parsed.data) });
      res.status(201).json(toJson(row));
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        res.status(409).json({ error: 'duplicate_code' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

rolesWriteRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.role.update({
        where: { id },
        data: dataFromParsed(parsed.data),
      });
      res.json(toJson(row));
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        res.status(409).json({ error: 'duplicate_code' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

rolesWriteRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.role.delete({ where: { id } });
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
