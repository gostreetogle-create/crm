import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sanitizeAuthzMatrixPayload } from '../lib/authz-matrix-sanitize.js';
import { collectAuthzDiagnostics } from '../lib/authz-diagnostics.js';

const SETTING_KEY = 'authz_matrix';

/** Чтение матрицы — любой авторизованный пользователь (нужно для единых прав в UI). */
export const authzMatrixReadRouter = Router();

/** Запись — только админ (`requireAdmin` на уровне `app.ts`). */
export const authzMatrixWriteRouter = Router();

/** Диагностика целостности матрицы и ролей — только админ. */
export const authzMatrixDiagnosticsRouter = Router();

const MatrixBodySchema = z.object({
  matrix: z.record(z.string(), z.array(z.string())).nullable(),
});

authzMatrixReadRouter.get('/', async (_req, res, next) => {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
    const raw = row?.valueJson as unknown;
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      res.json({ matrix: null });
      return;
    }
    const roleRows = await prisma.role.findMany({ select: { id: true } });
    const known = new Set(roleRows.map((r) => r.id));
    const matrix = raw as Record<string, string[]>;
    const sanitized = sanitizeAuthzMatrixPayload(matrix, known);
    const out = Object.keys(sanitized).length > 0 ? sanitized : null;
    res.json({ matrix: out });
  } catch (e) {
    next(e);
  }
});

authzMatrixDiagnosticsRouter.get('/diagnostics', async (_req, res, next) => {
  try {
    const report = await collectAuthzDiagnostics(prisma);
    res.json(report);
  } catch (e) {
    next(e);
  }
});

authzMatrixWriteRouter.put('/', async (req, res, next) => {
  try {
    const parsed = MatrixBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { matrix } = parsed.data;

    if (matrix === null || Object.keys(matrix).length === 0) {
      await prisma.appSetting.deleteMany({ where: { key: SETTING_KEY } });
      res.json({ ok: true, matrix: null });
      return;
    }

    const roleIds = Object.keys(matrix);
    const existing = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    const known = new Set(existing.map((r) => r.id));
    const sanitized = sanitizeAuthzMatrixPayload(matrix, known);

    if (Object.keys(sanitized).length === 0) {
      await prisma.appSetting.deleteMany({ where: { key: SETTING_KEY } });
      res.json({ ok: true, matrix: null });
      return;
    }

    await prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, valueJson: sanitized },
      update: { valueJson: sanitized },
    });
    res.json({ ok: true, matrix: sanitized });
  } catch (e) {
    next(e);
  }
});
