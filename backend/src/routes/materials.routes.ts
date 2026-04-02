import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const materialsRouter = Router();

const InputSchema = z.object({
  name: z.string().trim().min(1),
  code: z.union([z.string(), z.null(), z.undefined()]).optional(),
  unitId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  purchasePriceRub: z.union([z.number(), z.null(), z.undefined()]).optional(),
  materialCharacteristicId: z.string().min(1),
  geometryId: z.string().min(1),
  supplierOrganizationId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  isActive: z.boolean(),
});

function dataFromParsed(p: z.infer<typeof InputSchema>) {
  return {
    name: p.name,
    code: p.code != null && String(p.code).trim() ? String(p.code).trim() : null,
    unitId: p.unitId != null && String(p.unitId).trim() ? String(p.unitId).trim() : null,
    purchasePriceRub: p.purchasePriceRub ?? null,
    materialCharacteristicId: p.materialCharacteristicId,
    geometryId: p.geometryId,
    supplierOrganizationId:
      p.supplierOrganizationId != null && String(p.supplierOrganizationId).trim()
        ? String(p.supplierOrganizationId).trim()
        : null,
    notes: p.notes != null && String(p.notes).trim() ? String(p.notes).trim() : null,
    isActive: p.isActive,
  };
}

function mapMaterial(m: {
  id: string;
  name: string;
  code: string | null;
  unitId: string | null;
  purchasePriceRub: number | null;
  materialCharacteristicId: string;
  geometryId: string;
  supplierOrganizationId: string | null;
  notes: string | null;
  isActive: boolean;
  unit: { name: string; code: string | null } | null;
  geometry: { name: string } | null;
  supplierOrganization: { name: string; shortName: string | null } | null;
}): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: m.id,
    name: m.name,
    materialCharacteristicId: m.materialCharacteristicId,
    geometryId: m.geometryId,
    isActive: m.isActive,
  };
  if (m.code) o.code = m.code;
  if (m.unitId) o.unitId = m.unitId;
  if (m.unit) {
    o.unitName = m.unit.name;
    if (m.unit.code) o.unitCode = m.unit.code;
  }
  if (m.purchasePriceRub != null) o.purchasePriceRub = m.purchasePriceRub;
  if (m.geometry) o.geometryName = m.geometry.name;
  if (m.supplierOrganizationId) o.supplierOrganizationId = m.supplierOrganizationId;
  if (m.supplierOrganization) {
    const sn = m.supplierOrganization.shortName?.trim();
    o.supplierOrganizationLabel = sn || m.supplierOrganization.name;
  }
  if (m.notes) o.notes = m.notes;
  return o;
}

materialsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.material.findMany({
      orderBy: { name: 'asc' },
      include: { unit: true, geometry: true, supplierOrganization: true },
    });
    res.json(rows.map(mapMaterial));
  } catch (e) {
    next(e);
  }
});

materialsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const row = await prisma.material.create({
      data: dataFromParsed(parsed.data),
      include: { unit: true, geometry: true, supplierOrganization: true },
    });
    res.status(201).json(mapMaterial(row));
  } catch (e) {
    next(e);
  }
});

materialsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      const row = await prisma.material.update({
        where: { id },
        data: dataFromParsed(parsed.data),
        include: { unit: true, geometry: true, supplierOrganization: true },
      });
      res.json(mapMaterial(row));
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

materialsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.material.delete({ where: { id } });
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
