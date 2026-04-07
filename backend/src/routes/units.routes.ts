import { Router } from 'express';
import { z } from 'zod';
import { writeDiagnostic } from '../lib/diagnostic-log.js';
import { prisma } from '../lib/prisma.js';

export const unitsRouter = Router();

const UnitInputSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(2),
  notes: z.string().trim().optional(),
  isActive: z.boolean(),
});

const UnitsQuerySchema = z.object({
  name: z.string().trim().optional(),
  code: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
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

function toFieldMessageErrors(parsed: z.ZodError): Array<{ field: string; message: string }> {
  return parsed.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

async function ensureCodeUnique(code: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.unit.findFirst({
    where: {
      code: { equals: code, mode: 'insensitive' },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}

function writeUnitsAudit(
  req: { requestId?: string; auth?: { userId: string; login: string; roleId: string } },
  action: 'create' | 'update' | 'delete',
  unitId: string,
  unitCode: string | null,
): void {
  writeDiagnostic({
    ts: new Date().toISOString(),
    type: 'units_audit',
    requestId: req.requestId,
    message: `units.${action} user=${req.auth?.userId ?? 'anonymous'} id=${unitId} code=${unitCode ?? ''}`,
  });
}

unitsRouter.get('/', async (req, res, next) => {
  try {
    const parsedQuery = UnitsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ error: 'invalid_query', errors: toFieldMessageErrors(parsedQuery.error) });
      return;
    }
    const { name, code, page, pageSize } = parsedQuery.data;
    const rows = await prisma.unit.findMany({
      where: {
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(code ? { code: { contains: code, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      ...(page && pageSize ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

unitsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = UnitInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', errors: toFieldMessageErrors(parsed.error) });
      return;
    }
    const { name, code, notes, isActive } = parsed.data;
    const codeNorm = normalizeCode(code);
    const unique = await ensureCodeUnique(codeNorm);
    if (!unique) {
      res.status(409).json({
        error: 'code_not_unique',
        errors: [{ field: 'code', message: 'Код единицы уже используется.' }],
      });
      return;
    }
    const row = await prisma.unit.create({
      data: {
        name,
        code: codeNorm,
        notes: notes?.length ? notes : null,
        isActive,
      },
    });
    writeUnitsAudit(req, 'create', row.id, row.code);
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
      res.status(400).json({ error: 'invalid_body', errors: toFieldMessageErrors(parsed.error) });
      return;
    }
    const { name, code, notes, isActive } = parsed.data;
    const codeNorm = normalizeCode(code);
    const unique = await ensureCodeUnique(codeNorm, id);
    if (!unique) {
      res.status(409).json({
        error: 'code_not_unique',
        errors: [{ field: 'code', message: 'Код единицы уже используется.' }],
      });
      return;
    }
    try {
      const row = await prisma.unit.update({
        where: { id },
        data: {
          name,
          code: codeNorm,
          notes: notes?.length ? notes : null,
          isActive,
        },
      });
      writeUnitsAudit(req, 'update', row.id, row.code);
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
      const row = await prisma.unit.delete({ where: { id } });
      writeUnitsAudit(req, 'delete', row.id, row.code);
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
