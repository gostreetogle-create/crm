import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const materialCharacteristicsRouter = Router();

const OptStr = z.union([z.string(), z.null(), z.undefined()]).optional();
const OptNum = z.union([z.number(), z.null(), z.undefined()]).optional();

const InputSchema = z.object({
  name: z.string().trim().min(1),
  code: OptStr,
  densityKgM3: OptNum,
  colorId: OptStr,
  colorName: OptStr,
  colorHex: OptStr,
  surfaceFinishId: OptStr,
  finishType: OptStr,
  roughnessClass: OptStr,
  raMicron: OptNum,
  coatingId: OptStr,
  coatingType: OptStr,
  coatingSpec: OptStr,
  coatingThicknessMicron: OptNum,
  notes: OptStr,
  isActive: z.boolean(),
});

type McRow = {
  id: string;
  name: string;
  code: string | null;
  densityKgM3: number | null;
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  surfaceFinishId: string | null;
  finishType: string | null;
  roughnessClass: string | null;
  raMicron: number | null;
  coatingId: string | null;
  coatingType: string | null;
  coatingSpec: string | null;
  coatingThicknessMicron: number | null;
  notes: string | null;
  isActive: boolean;
};

function strOrUndef(v: string | null | undefined): string | undefined {
  if (v == null || v === '') return undefined;
  return v;
}

function toJson(row: McRow): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
  };
  if (row.code) o.code = row.code;
  if (row.densityKgM3 != null) o.densityKgM3 = row.densityKgM3;
  if (row.colorId) o.colorId = row.colorId;
  if (strOrUndef(row.colorName)) o.colorName = row.colorName;
  if (strOrUndef(row.colorHex)) o.colorHex = row.colorHex;
  if (row.surfaceFinishId) o.surfaceFinishId = row.surfaceFinishId;
  if (strOrUndef(row.finishType)) o.finishType = row.finishType;
  if (strOrUndef(row.roughnessClass)) o.roughnessClass = row.roughnessClass;
  if (row.raMicron != null) o.raMicron = row.raMicron;
  if (row.coatingId) o.coatingId = row.coatingId;
  if (strOrUndef(row.coatingType)) o.coatingType = row.coatingType;
  if (strOrUndef(row.coatingSpec)) o.coatingSpec = row.coatingSpec;
  if (row.coatingThicknessMicron != null) o.coatingThicknessMicron = row.coatingThicknessMicron;
  if (strOrUndef(row.notes)) o.notes = row.notes;
  return o;
}

function dataFromParsed(p: z.infer<typeof InputSchema>) {
  return {
    name: p.name,
    code: p.code && String(p.code).trim() ? String(p.code).trim() : null,
    densityKgM3: p.densityKgM3 ?? null,
    colorId: p.colorId && String(p.colorId).trim() ? String(p.colorId).trim() : null,
    colorName: p.colorName != null && String(p.colorName).trim() ? String(p.colorName).trim() : null,
    colorHex: p.colorHex != null && String(p.colorHex).trim() ? String(p.colorHex).trim() : null,
    surfaceFinishId:
      p.surfaceFinishId && String(p.surfaceFinishId).trim() ? String(p.surfaceFinishId).trim() : null,
    finishType: p.finishType != null && String(p.finishType).trim() ? String(p.finishType).trim() : null,
    roughnessClass:
      p.roughnessClass != null && String(p.roughnessClass).trim() ? String(p.roughnessClass).trim() : null,
    raMicron: p.raMicron ?? null,
    coatingId: p.coatingId && String(p.coatingId).trim() ? String(p.coatingId).trim() : null,
    coatingType: p.coatingType != null && String(p.coatingType).trim() ? String(p.coatingType).trim() : null,
    coatingSpec: p.coatingSpec != null && String(p.coatingSpec).trim() ? String(p.coatingSpec).trim() : null,
    coatingThicknessMicron: p.coatingThicknessMicron ?? null,
    notes: p.notes != null && String(p.notes).trim() ? String(p.notes).trim() : null,
    isActive: p.isActive,
  };
}

materialCharacteristicsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.materialCharacteristic.findMany({ orderBy: { name: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

materialCharacteristicsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.materialCharacteristic.create({ data: dataFromParsed(parsed.data) });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

materialCharacteristicsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.materialCharacteristic.update({
        where: { id },
        data: dataFromParsed(parsed.data),
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

materialCharacteristicsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.materialCharacteristic.delete({ where: { id } });
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
