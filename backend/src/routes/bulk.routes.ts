import { Router } from "express";
import { z } from "zod";
import {
  exportBulkCoatings,
  exportBulkColors,
  exportBulkGeometries,
  exportBulkMaterialCharacteristics,
  exportBulkMaterials,
  exportBulkProductionWorkTypes,
  exportBulkRoles,
  exportBulkSurfaceFinishes,
  exportBulkTradeGoods,
  exportBulkUnits,
} from "../lib/bulk-export.js";
import { prisma } from "../lib/prisma.js";
import { numOrNull, strOrNull, sumPriceAndCostFromTradeGoodLines } from "../lib/trade-good-pricing.js";
import { resolveTradeGoodCategoryIdsFromNames } from "../lib/trade-good-classification-resolve.js";
import {
  bulkPurgeSegmentToPermissionKey,
  isBulkPurgeSegment,
  isPrismaForeignKeyBlock,
  purgeBulkSegment,
} from "../lib/bulk-purge.js";
import { getEffectivePermissionKeysForRoleId } from "../lib/authz-effective-keys.js";
import { writeDiagnostic } from "../lib/diagnostic-log.js";
import {
  BULK_ALL_PERMISSION_KEY,
  requireEffectiveBulkPermissionKey,
} from "../middleware/require-effective-permission.js";
import { registerBulkExtendedRoutes } from "../lib/bulk-register-extended.js";

export const bulkRouter = Router();

const MAX_ITEMS = 5000;

/** Пустая строка в JSON-шаблоне → undefined, иначе Zod падает на `uuid` / `min(1)` у optional-полей. */
function emptyStrToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema);
}

const BulkUnitsBodySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        code: z.string().trim().optional(),
        notes: z.string().trim().optional(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkColorsBodySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        hex: z.string().trim().min(1),
        rgbR: z.number().int(),
        rgbG: z.number().int(),
        rgbB: z.number().int(),
        ralCode: z.string().trim().optional().nullable(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkSurfaceFinishesBodySchema = z.object({
  items: z
    .array(
      z.object({
        finishType: z.string().trim().min(1),
        roughnessClass: z.string().trim().min(1),
        raMicron: z.number().optional().nullable(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkCoatingsBodySchema = z.object({
  items: z
    .array(
      z.object({
        coatingType: z.string().trim().min(1),
        coatingSpec: z.string().trim().min(1),
        thicknessMicron: z.number().optional().nullable(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkGeometriesBodySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        shapeKey: z.string().trim().min(1),
        heightMm: z.number().optional().nullable(),
        lengthMm: z.number().optional().nullable(),
        widthMm: z.number().optional().nullable(),
        diameterMm: z.number().optional().nullable(),
        thicknessMm: z.number().optional().nullable(),
        notes: z.string().trim().optional().nullable(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const nullableUuid = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.union([z.string().uuid(), z.null()]).optional(),
);

const BulkMaterialCharacteristicsBodySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        code: z.string().trim().optional().nullable(),
        densityKgM3: z.number().optional().nullable(),
        colorId: nullableUuid,
        colorName: z.string().optional().nullable(),
        colorHex: z.string().optional().nullable(),
        surfaceFinishId: nullableUuid,
        finishType: z.string().optional().nullable(),
        roughnessClass: z.string().optional().nullable(),
        raMicron: z.number().optional().nullable(),
        coatingId: nullableUuid,
        coatingType: z.string().optional().nullable(),
        coatingSpec: z.string().optional().nullable(),
        coatingThicknessMicron: z.number().optional().nullable(),
        notes: z.string().trim().optional().nullable(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkMaterialsBodySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        code: z.string().trim().optional().nullable(),
        materialCharacteristicId: z.string().uuid(),
        geometryId: z.string().uuid(),
        unitId: nullableUuid,
        supplierOrganizationId: nullableUuid,
        purchasePriceRub: z.number().optional().nullable(),
        notes: z.string().trim().optional().nullable(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkProductionWorkTypesBodySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        shortLabel: z.string().trim().min(1),
        hourlyRateRub: z.number().min(1),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkTradeGoodsBodySchema = z.object({
  items: z
    .array(
      z.object({
        code: z.string().trim().optional().nullable(),
        name: z.string().trim().min(1),
        description: z.string().trim().optional().nullable(),
        category: z.string().trim().optional().nullable(),
        subcategory: z.string().trim().optional().nullable(),
        unitCode: z.string().trim().optional().nullable(),
        priceRub: z.number().optional().nullable(),
        costRub: z.number().optional().nullable(),
        notes: z.string().trim().optional().nullable(),
        isActive: z.boolean().optional().default(true),
        kind: z.enum(["ITEM", "COMPLEX"]).optional(),
        lines: z
          .array(
            z.object({
              productId: emptyStrToUndefined(z.string().uuid().optional()),
              productCode: emptyStrToUndefined(z.string().trim().min(1).optional()),
              productName: emptyStrToUndefined(z.string().trim().min(1).optional()),
              tradeGoodId: emptyStrToUndefined(z.string().uuid().optional()),
              tradeGoodCode: emptyStrToUndefined(z.string().trim().min(1).optional()),
              tradeGoodName: emptyStrToUndefined(z.string().trim().min(1).optional()),
              qty: z.preprocess(
                (v) => (v === "" || v === null ? undefined : v),
                z.number().positive().optional(),
              ),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkRolesBodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        code: z.string().trim().min(1),
        name: z.string().trim().min(1),
        sortOrder: z.number().int(),
        notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
        isActive: z.boolean().optional().default(true),
        isSystem: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

bulkRouter.post("/units", requireEffectiveBulkPermissionKey("admin.bulk.units"), async (req, res, next) => {
  try {
    const parsed = BulkUnitsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
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
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.post("/colors", requireEffectiveBulkPermissionKey("admin.bulk.colors"), async (req, res, next) => {
  try {
    const parsed = BulkColorsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      try {
        const row = await prisma.color.create({
          data: {
            name: it.name,
            hex: it.hex,
            rgbR: it.rgbR,
            rgbG: it.rgbG,
            rgbB: it.rgbB,
            ralCode: it.ralCode?.trim().length ? it.ralCode.trim() : null,
          },
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.post(
  "/surface-finishes",
  requireEffectiveBulkPermissionKey("admin.bulk.surface_finishes"),
  async (req, res, next) => {
    try {
      const parsed = BulkSurfaceFinishesBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const items = parsed.data.items;
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!;
        try {
          const row = await prisma.surfaceFinish.create({
            data: {
              finishType: it.finishType,
              roughnessClass: it.roughnessClass,
              raMicron: it.raMicron ?? null,
            },
          });
          created.push({ index: i, id: row.id });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "create_failed";
          errors.push({ index: i, message });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  },
);

bulkRouter.post("/coatings", requireEffectiveBulkPermissionKey("admin.bulk.coatings"), async (req, res, next) => {
  try {
    const parsed = BulkCoatingsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      try {
        const row = await prisma.coating.create({
          data: {
            coatingType: it.coatingType,
            coatingSpec: it.coatingSpec,
            thicknessMicron: it.thicknessMicron ?? null,
          },
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.post("/geometries", requireEffectiveBulkPermissionKey("admin.bulk.geometries"), async (req, res, next) => {
  try {
    const parsed = BulkGeometriesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      try {
        const row = await prisma.geometry.create({
          data: {
            name: it.name,
            shapeKey: it.shapeKey,
            heightMm: it.heightMm ?? null,
            lengthMm: it.lengthMm ?? null,
            widthMm: it.widthMm ?? null,
            diameterMm: it.diameterMm ?? null,
            thicknessMm: it.thicknessMm ?? null,
            notes: it.notes?.length ? it.notes : null,
            isActive: it.isActive ?? true,
          },
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.post(
  "/material-characteristics",
  requireEffectiveBulkPermissionKey("admin.bulk.material_characteristics"),
  async (req, res, next) => {
    try {
      const parsed = BulkMaterialCharacteristicsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const items = parsed.data.items;
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!;
        try {
          const row = await prisma.materialCharacteristic.create({
            data: {
              name: it.name,
              code: it.code?.trim().length ? it.code.trim() : null,
              densityKgM3: it.densityKgM3 ?? null,
              colorId: it.colorId ?? null,
              colorName: it.colorName ?? null,
              colorHex: it.colorHex ?? null,
              surfaceFinishId: it.surfaceFinishId ?? null,
              finishType: it.finishType ?? null,
              roughnessClass: it.roughnessClass ?? null,
              raMicron: it.raMicron ?? null,
              coatingId: it.coatingId ?? null,
              coatingType: it.coatingType ?? null,
              coatingSpec: it.coatingSpec ?? null,
              coatingThicknessMicron: it.coatingThicknessMicron ?? null,
              notes: it.notes?.length ? it.notes : null,
              isActive: it.isActive ?? true,
            },
          });
          created.push({ index: i, id: row.id });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "create_failed";
          errors.push({ index: i, message });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  },
);

bulkRouter.post("/materials", requireEffectiveBulkPermissionKey("admin.bulk.materials"), async (req, res, next) => {
  try {
    const parsed = BulkMaterialsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      try {
        const row = await prisma.material.create({
          data: {
            name: it.name,
            code: it.code?.trim().length ? it.code.trim() : null,
            materialCharacteristicId: it.materialCharacteristicId,
            geometryId: it.geometryId,
            unitId: it.unitId ?? null,
            supplierOrganizationId: it.supplierOrganizationId ?? null,
            purchasePriceRub: it.purchasePriceRub ?? null,
            notes: it.notes?.length ? it.notes : null,
            isActive: it.isActive ?? true,
          },
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.post(
  "/production-work-types",
  requireEffectiveBulkPermissionKey("admin.bulk.production_work_types"),
  async (req, res, next) => {
    try {
      const parsed = BulkProductionWorkTypesBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const items = parsed.data.items;
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!;
        try {
          const row = await prisma.productionWorkType.create({
            data: {
              name: it.name,
              shortLabel: it.shortLabel,
              hourlyRateRub: it.hourlyRateRub,
              isActive: it.isActive ?? true,
            },
          });
          created.push({ index: i, id: row.id });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "create_failed";
          errors.push({ index: i, message });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  },
);

bulkRouter.post("/trade-goods", requireEffectiveBulkPermissionKey("admin.bulk.trade_goods"), async (req, res, next) => {
  try {
    const parsed = BulkTradeGoodsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      try {
        const kind = it.kind ?? "ITEM";
        const normLines = [] as Array<{
          productId: string | null;
          tradeGoodId: string | null;
          sortOrder: number;
          qty: number;
        }>;
        let hasLineResolutionError = false;
        for (let li = 0; li < it.lines.length; li++) {
          const line = it.lines[li]!;
          const hasAnyLineRef =
            (line.tradeGoodId && line.tradeGoodId.trim()) ||
            (line.tradeGoodCode && line.tradeGoodCode.trim()) ||
            (line.tradeGoodName && line.tradeGoodName.trim()) ||
            (line.productName && line.productName.trim()) ||
            (line.productCode && line.productCode.trim()) ||
            (line.productId && line.productId.trim());
          if (!hasAnyLineRef) {
            continue;
          }
          let resolvedProductId: string | null = null;
          let resolvedTradeGoodId: string | null = null;

          if (line.tradeGoodId && line.tradeGoodId.trim()) {
            resolvedTradeGoodId = line.tradeGoodId.trim();
          } else if (line.tradeGoodCode && line.tradeGoodCode.trim()) {
            const code = line.tradeGoodCode.trim();
            const tgByCode = await prisma.tradeGood.findFirst({
              where: { code: { equals: code, mode: "insensitive" } },
              select: { id: true },
            });
            resolvedTradeGoodId = tgByCode?.id ?? null;
          } else if (line.tradeGoodName && line.tradeGoodName.trim()) {
            const name = line.tradeGoodName.trim();
            const matches = await prisma.tradeGood.findMany({
              where: { name: { equals: name, mode: "insensitive" } },
              select: { id: true },
              take: 2,
            });
            if (matches.length > 1) {
              hasLineResolutionError = true;
              errors.push({
                index: i,
                message:
                  `trade_good_line_name_ambiguous at line ${li}. ` +
                  `Найдено несколько товаров с именем \"${name}\"; используйте tradeGoodCode или tradeGoodId.`,
              });
              continue;
            }
            resolvedTradeGoodId = matches[0]?.id ?? null;
          }

          if (line.productName && line.productName.trim()) {
            const name = line.productName.trim();
            const matches = await prisma.manufacturedProduct.findMany({
              where: { name: { equals: name, mode: "insensitive" } },
              select: { id: true },
              take: 2,
            });
            if (matches.length > 1) {
              hasLineResolutionError = true;
              errors.push({
                index: i,
                message:
                  `trade_good_line_product_name_ambiguous at line ${li}. ` +
                  `Найдено несколько изделий с именем \"${name}\"; используйте productCode или productId.`,
              });
              continue;
            }
            resolvedProductId = matches[0]?.id ?? null;
          } else if (line.productCode && line.productCode.trim()) {
            const code = line.productCode.trim();
            const productByCode = await prisma.manufacturedProduct.findFirst({
              where: { code: { equals: code, mode: "insensitive" } },
              select: { id: true },
            });
            resolvedProductId = productByCode?.id ?? null;
          } else if (line.productId && line.productId.trim()) {
            resolvedProductId = line.productId.trim();
          }

          if (kind === "ITEM" && !resolvedProductId) {
            hasLineResolutionError = true;
            errors.push({
              index: i,
              message:
                `trade_good_line_product_ref_missing_or_not_found at line ${li}. ` +
                `Для ITEM укажите productName, productCode или productId.`,
            });
            continue;
          }
          if (kind === "COMPLEX" && !resolvedTradeGoodId) {
            hasLineResolutionError = true;
            errors.push({
              index: i,
              message:
                `trade_good_line_trade_good_ref_missing_or_not_found at line ${li}. ` +
                `Для COMPLEX укажите tradeGoodName, tradeGoodCode или tradeGoodId.`,
            });
            continue;
          }

          normLines.push({
            productId: kind === "ITEM" ? resolvedProductId : null,
            tradeGoodId: kind === "COMPLEX" ? resolvedTradeGoodId : null,
            sortOrder: normLines.length,
            qty: line.qty ?? 1,
          });
        }
        if (hasLineResolutionError) {
          continue;
        }

        const sums = await sumPriceAndCostFromTradeGoodLines(
          normLines.map((l) => ({ productId: l.productId, tradeGoodId: l.tradeGoodId, qty: l.qty })),
        );
        const priceRub = numOrNull(it.priceRub) ?? sums.price;
        const costRub = numOrNull(it.costRub) ?? sums.cost;
        const row = await prisma.$transaction(async (tx) => {
          const ids = await resolveTradeGoodCategoryIdsFromNames(tx, it.category, it.subcategory);
          return tx.tradeGood.create({
            data: {
              code: strOrNull(it.code),
              name: it.name.trim(),
              description: strOrNull(it.description),
              categoryId: ids.categoryId,
              subcategoryId: ids.subcategoryId,
              unitCode: strOrNull(it.unitCode),
              priceRub,
              costRub,
              notes: strOrNull(it.notes),
              isActive: it.isActive ?? true,
              kind,
              lines: {
                create: normLines.map((line) =>
                  line.productId
                    ? {
                        sortOrder: line.sortOrder,
                        qty: line.qty,
                        product: { connect: { id: line.productId } },
                      }
                    : {
                        sortOrder: line.sortOrder,
                        qty: line.qty,
                        componentTradeGood: { connect: { id: String(line.tradeGoodId) } },
                      },
                ),
              },
            },
          });
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.post("/roles", requireEffectiveBulkPermissionKey("admin.bulk.roles"), async (req, res, next) => {
  try {
    const parsed = BulkRolesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const items = parsed.data.items;
    const created: Array<{ index: number; id: string }> = [];
    const errors: Array<{ index: number; message: string }> = [];

    const notesOrNull = (v: string | null | undefined): string | null => {
      if (v == null || v === undefined) return null;
      const t = String(v).trim();
      return t.length ? t : null;
    };

    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const codeLower = it.code.trim().toLowerCase();
      try {
        let existing = null as Awaited<ReturnType<typeof prisma.role.findUnique>> | null;
        if (it.id) {
          existing = await prisma.role.findUnique({ where: { id: it.id } });
          if (!existing) {
            errors.push({ index: i, message: "role_id_not_found" });
            continue;
          }
        } else {
          existing = await prisma.role.findUnique({ where: { code: codeLower } });
        }

        if (existing?.isSystem) {
          await prisma.role.update({
            where: { id: existing.id },
            data: {
              name: it.name.trim(),
              sortOrder: it.sortOrder,
              notes: notesOrNull(it.notes),
              isActive: it.isActive ?? true,
            },
          });
          created.push({ index: i, id: existing.id });
          continue;
        }

        if (existing) {
          await prisma.role.update({
            where: { id: existing.id },
            data: {
              code: codeLower,
              name: it.name.trim(),
              sortOrder: it.sortOrder,
              notes: notesOrNull(it.notes),
              isActive: it.isActive ?? true,
              isSystem: false,
            },
          });
          created.push({ index: i, id: existing.id });
          continue;
        }

        if (it.isSystem === true) {
          errors.push({ index: i, message: "cannot_create_system_role_via_bulk" });
          continue;
        }

        const row = await prisma.role.create({
          data: {
            code: codeLower,
            name: it.name.trim(),
            sortOrder: it.sortOrder,
            notes: notesOrNull(it.notes),
            isActive: it.isActive ?? true,
            isSystem: false,
          },
        });
        created.push({ index: i, id: row.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "create_failed";
        errors.push({ index: i, message });
      }
    }
    res.json({ ok: errors.length === 0, created, errors });
  } catch (e) {
    next(e);
  }
});

bulkRouter.get("/units/export", requireEffectiveBulkPermissionKey("admin.bulk.units"), async (_req, res, next) => {
  try {
    res.json(await exportBulkUnits());
  } catch (e) {
    next(e);
  }
});

bulkRouter.get("/colors/export", requireEffectiveBulkPermissionKey("admin.bulk.colors"), async (_req, res, next) => {
  try {
    res.json(await exportBulkColors());
  } catch (e) {
    next(e);
  }
});

bulkRouter.get(
  "/surface-finishes/export",
  requireEffectiveBulkPermissionKey("admin.bulk.surface_finishes"),
  async (_req, res, next) => {
    try {
      res.json(await exportBulkSurfaceFinishes());
    } catch (e) {
      next(e);
    }
  },
);

bulkRouter.get("/coatings/export", requireEffectiveBulkPermissionKey("admin.bulk.coatings"), async (_req, res, next) => {
  try {
    res.json(await exportBulkCoatings());
  } catch (e) {
    next(e);
  }
});

bulkRouter.get("/geometries/export", requireEffectiveBulkPermissionKey("admin.bulk.geometries"), async (_req, res, next) => {
  try {
    res.json(await exportBulkGeometries());
  } catch (e) {
    next(e);
  }
});

bulkRouter.get(
  "/material-characteristics/export",
  requireEffectiveBulkPermissionKey("admin.bulk.material_characteristics"),
  async (_req, res, next) => {
    try {
      res.json(await exportBulkMaterialCharacteristics());
    } catch (e) {
      next(e);
    }
  },
);

bulkRouter.get("/materials/export", requireEffectiveBulkPermissionKey("admin.bulk.materials"), async (_req, res, next) => {
  try {
    res.json(await exportBulkMaterials());
  } catch (e) {
    next(e);
  }
});

bulkRouter.get(
  "/production-work-types/export",
  requireEffectiveBulkPermissionKey("admin.bulk.production_work_types"),
  async (_req, res, next) => {
    try {
      res.json(await exportBulkProductionWorkTypes());
    } catch (e) {
      next(e);
    }
  },
);

bulkRouter.get("/trade-goods/export", requireEffectiveBulkPermissionKey("admin.bulk.trade_goods"), async (_req, res, next) => {
  try {
    res.json(await exportBulkTradeGoods());
  } catch (e) {
    next(e);
  }
});

bulkRouter.get("/roles/export", requireEffectiveBulkPermissionKey("admin.bulk.roles"), async (_req, res, next) => {
  try {
    res.json(await exportBulkRoles());
  } catch (e) {
    next(e);
  }
});

registerBulkExtendedRoutes(bulkRouter);

/** Полное удаление всех строк таблицы (те же права, что у массового POST для сегмента). */
bulkRouter.delete("/:segment/all", async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const raw = req.params.segment;
    if (!isBulkPurgeSegment(raw)) {
      res.status(404).json({ ok: false, error: "unknown_segment" });
      return;
    }
    const segment = raw;
    const key = bulkPurgeSegmentToPermissionKey(segment);
    try {
      const keys = await getEffectivePermissionKeysForRoleId(req.auth.roleId);
      if (!keys.has(key) && !keys.has(BULK_ALL_PERMISSION_KEY)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
    } catch (dbErr) {
      const stack = dbErr instanceof Error ? dbErr.stack : String(dbErr);
      writeDiagnostic({
        ts: new Date().toISOString(),
        type: "authz_effective_keys_db_error",
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        message: dbErr instanceof Error ? dbErr.message : String(dbErr),
        name: dbErr instanceof Error ? dbErr.name : "Error",
        stack: stack ? stack.slice(0, 2000) : undefined,
      });
      res.status(503).json({
        error: "db_unavailable",
        message: "Не удалось проверить права (БД).",
        requestId: req.requestId,
      });
      return;
    }

    try {
      const { deleted } = await purgeBulkSegment(segment);
      res.json({ ok: true, deleted });
    } catch (e: unknown) {
      if (isPrismaForeignKeyBlock(e)) {
        res.status(409).json({
          ok: false,
          error: "delete_blocked_by_references",
          message:
            "Удаление невозможно: есть связанные записи в других таблицах. Сначала удалите или измените ссылки.",
        });
        return;
      }
      next(e);
    }
  } catch (e) {
    next(e);
  }
});
