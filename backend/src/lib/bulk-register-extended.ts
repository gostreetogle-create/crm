import bcrypt from "bcryptjs";
import type { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { computeProductionDetailTotals } from "./production-detail-pricing.js";
import {
  exportBulkCatalogProducts,
  exportBulkClients,
  exportBulkComplexes,
  exportBulkKpPhotos,
  exportBulkManufacturedProducts,
  exportBulkOrganizations,
  exportBulkProductionDetails,
  exportBulkUsers,
} from "./bulk-export-more.js";
import { requireEffectiveBulkPermissionKey } from "../middleware/require-effective-permission.js";

const MAX_ITEMS = 5000;

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

const BulkClientsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        lastName: z.string().trim().min(1),
        firstName: z.string().trim().min(1),
        patronymic: z.string(),
        phone: z.string(),
        address: z.string(),
        email: z.string(),
        notes: z.string().optional(),
        clientMarkupPercent: z.number().nullable().optional(),
        isActive: z.boolean().optional().default(true),
        passportSeries: z.string().optional(),
        passportNumber: z.string().optional(),
        passportIssuedBy: z.string().optional(),
        passportIssuedDate: z.string().optional(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkOrgsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1),
        shortName: z.string().nullable().optional(),
        legalForm: z.string().nullable().optional(),
        inn: z.string().nullable().optional(),
        kpp: z.string().nullable().optional(),
        ogrn: z.string().nullable().optional(),
        okpo: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        legalAddress: z.string().nullable().optional(),
        postalAddress: z.string().nullable().optional(),
        bankName: z.string().nullable().optional(),
        bankBik: z.string().nullable().optional(),
        bankAccount: z.string().nullable().optional(),
        bankCorrAccount: z.string().nullable().optional(),
        signerName: z.string().nullable().optional(),
        signerPosition: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkKpSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1),
        organizationId: z.string().uuid(),
        photoTitle: z.string().trim().min(1),
        photoFileName: z.string().nullable().optional(),
        photoUrl: z.string().nullable().optional(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkUsersSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        login: z.string().trim().min(1),
        password: z.string().min(6).optional(),
        fullName: z.string().trim().min(1),
        email: z.string().trim().min(1),
        phone: z.string(),
        roleId: z.string().min(1),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkPdSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1),
        code: z.union([z.string(), z.null(), z.undefined()]).optional(),
        qty: z.number().positive().optional(),
        notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
        isActive: z.boolean().optional().default(true),
        sourceMaterialId: z.union([z.string(), z.null(), z.undefined()]).optional(),
        sourceWorkTypeId: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotMaterialName: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotMaterialCode: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotUnitCode: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotUnitName: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotPurchasePriceRub: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotDensityKgM3: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotHeightMm: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotLengthMm: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotWidthMm: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotDiameterMm: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotThicknessMm: z.union([z.number(), z.null(), z.undefined()]).optional(),
        snapshotCharacteristicName: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotWorkTypeName: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotWorkShortLabel: z.union([z.string(), z.null(), z.undefined()]).optional(),
        snapshotHourlyRateRub: z.union([z.number(), z.null(), z.undefined()]).optional(),
        workTimeHours: z.union([z.number(), z.null(), z.undefined()]).optional(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkMpSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        code: z.union([z.string(), z.null(), z.undefined()]).optional(),
        name: z.string().trim().min(1),
        description: z.union([z.string(), z.null(), z.undefined()]).optional(),
        priceRub: z.union([z.number(), z.null(), z.undefined()]).optional(),
        costRub: z.union([z.number(), z.null(), z.undefined()]).optional(),
        notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkCxSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1),
        code: z.union([z.string(), z.null(), z.undefined()]).optional(),
        description: z.union([z.string(), z.null(), z.undefined()]).optional(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

const BulkCatProdSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        complexId: z.string().uuid(),
        name: z.string().trim().min(1),
        code: z.union([z.string(), z.null(), z.undefined()]).optional(),
        description: z.union([z.string(), z.null(), z.undefined()]).optional(),
        price: z.number().nonnegative(),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

function pdDataFromZod(p: z.infer<typeof BulkPdSchema>["items"][number]) {
  const qty = p.qty != null && Number.isFinite(p.qty) && p.qty > 0 ? p.qty : 1;
  const totals = computeProductionDetailTotals({
    qty,
    snapshotPurchasePriceRub: p.snapshotPurchasePriceRub ?? null,
    snapshotUnitCode: strOrNull(p.snapshotUnitCode),
    snapshotUnitName: strOrNull(p.snapshotUnitName),
    snapshotDensityKgM3: numOrNull(p.snapshotDensityKgM3),
    snapshotHeightMm: numOrNull(p.snapshotHeightMm),
    snapshotLengthMm: numOrNull(p.snapshotLengthMm),
    snapshotWidthMm: numOrNull(p.snapshotWidthMm),
    snapshotDiameterMm: numOrNull(p.snapshotDiameterMm),
    snapshotThicknessMm: numOrNull(p.snapshotThicknessMm),
    snapshotHourlyRateRub: numOrNull(p.snapshotHourlyRateRub),
    workTimeHours: numOrNull(p.workTimeHours),
  });
  return {
    name: p.name,
    code: strOrNull(p.code),
    qty,
    notes: strOrNull(p.notes),
    isActive: p.isActive ?? true,
    sourceMaterialId: strOrNull(p.sourceMaterialId),
    sourceWorkTypeId: strOrNull(p.sourceWorkTypeId),
    snapshotMaterialName: strOrNull(p.snapshotMaterialName),
    snapshotMaterialCode: strOrNull(p.snapshotMaterialCode),
    snapshotUnitCode: strOrNull(p.snapshotUnitCode),
    snapshotUnitName: strOrNull(p.snapshotUnitName),
    snapshotPurchasePriceRub: numOrNull(p.snapshotPurchasePriceRub),
    snapshotDensityKgM3: numOrNull(p.snapshotDensityKgM3),
    snapshotHeightMm: numOrNull(p.snapshotHeightMm),
    snapshotLengthMm: numOrNull(p.snapshotLengthMm),
    snapshotWidthMm: numOrNull(p.snapshotWidthMm),
    snapshotDiameterMm: numOrNull(p.snapshotDiameterMm),
    snapshotThicknessMm: numOrNull(p.snapshotThicknessMm),
    snapshotCharacteristicName: strOrNull(p.snapshotCharacteristicName),
    snapshotWorkTypeName: strOrNull(p.snapshotWorkTypeName),
    snapshotWorkShortLabel: strOrNull(p.snapshotWorkShortLabel),
    snapshotHourlyRateRub: numOrNull(p.snapshotHourlyRateRub),
    workTimeHours: numOrNull(p.workTimeHours),
    materialTotalRub: totals.materialTotalRub,
    workTotalRub: totals.workTotalRub,
    lineTotalRub: totals.lineTotalRub,
  };
}

export function registerBulkExtendedRoutes(bulkRouter: Router): void {
  bulkRouter.post("/clients", requireEffectiveBulkPermissionKey("admin.bulk.clients"), async (req, res, next) => {
    try {
      const parsed = BulkClientsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const data = {
            lastName: it.lastName,
            firstName: it.firstName,
            patronymic: it.patronymic,
            phone: it.phone,
            address: it.address,
            email: it.email,
            notes: it.notes ?? "",
            clientMarkupPercent: it.clientMarkupPercent ?? null,
            isActive: it.isActive ?? true,
            passportSeries: it.passportSeries ?? "",
            passportNumber: it.passportNumber ?? "",
            passportIssuedBy: it.passportIssuedBy ?? "",
            passportIssuedDate: it.passportIssuedDate ?? "",
          };
          if (it.id) {
            const row = await prisma.client.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const row = await prisma.client.create({ data });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.post("/organizations", requireEffectiveBulkPermissionKey("admin.bulk.organizations"), async (req, res, next) => {
    try {
      const parsed = BulkOrgsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const data = {
            name: it.name,
            shortName: strOrNull(it.shortName),
            legalForm: strOrNull(it.legalForm),
            inn: strOrNull(it.inn),
            kpp: strOrNull(it.kpp),
            ogrn: strOrNull(it.ogrn),
            okpo: strOrNull(it.okpo),
            phone: strOrNull(it.phone),
            email: strOrNull(it.email),
            website: strOrNull(it.website),
            legalAddress: strOrNull(it.legalAddress),
            postalAddress: strOrNull(it.postalAddress),
            bankName: strOrNull(it.bankName),
            bankBik: strOrNull(it.bankBik),
            bankAccount: strOrNull(it.bankAccount),
            bankCorrAccount: strOrNull(it.bankCorrAccount),
            signerName: strOrNull(it.signerName),
            signerPosition: strOrNull(it.signerPosition),
            notes: strOrNull(it.notes),
            isActive: it.isActive ?? true,
          };
          if (it.id) {
            const row = await prisma.organization.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const row = await prisma.organization.create({ data });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.post("/kp-photos", requireEffectiveBulkPermissionKey("admin.bulk.kp_photos"), async (req, res, next) => {
    try {
      const parsed = BulkKpSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const org = await prisma.organization.findUnique({ where: { id: it.organizationId } });
          if (!org) {
            errors.push({ index: i, message: "invalid_organization" });
            continue;
          }
          const data = {
            name: it.name,
            organizationId: it.organizationId,
            photoTitle: it.photoTitle,
            photoFileName: strOrNull(it.photoFileName),
            photoUrl: it.photoUrl != null && String(it.photoUrl).trim() ? String(it.photoUrl) : null,
            isActive: it.isActive ?? true,
          };
          if (it.id) {
            const row = await prisma.kpPhoto.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const row = await prisma.kpPhoto.create({ data });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.post("/users", requireEffectiveBulkPermissionKey("admin.bulk.users"), async (req, res, next) => {
    try {
      const parsed = BulkUsersSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      const defaultPwd = "BulkImport1!";
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const role = await prisma.role.findUnique({ where: { id: it.roleId } });
          if (!role) {
            errors.push({ index: i, message: "invalid_role" });
            continue;
          }
          const pwd = it.password?.trim() ? it.password : defaultPwd;
          if (it.id) {
            const data: {
              login: string;
              fullName: string;
              email: string;
              phone: string;
              roleId: string;
              passwordHash?: string;
            } = {
              login: it.login,
              fullName: it.fullName,
              email: it.email,
              phone: it.phone,
              roleId: it.roleId,
            };
            if (it.password && it.password.trim()) {
              data.passwordHash = await bcrypt.hash(it.password, 10);
            }
            const row = await prisma.user.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const passwordHash = await bcrypt.hash(pwd, 10);
            const row = await prisma.user.create({
              data: {
                login: it.login,
                passwordHash,
                fullName: it.fullName,
                email: it.email,
                phone: it.phone,
                roleId: it.roleId,
              },
            });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.post("/production-details", requireEffectiveBulkPermissionKey("admin.bulk.production_details"), async (req, res, next) => {
    try {
      const parsed = BulkPdSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const data = pdDataFromZod(it);
          if (it.id) {
            const row = await prisma.productionDetail.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const row = await prisma.productionDetail.create({ data });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.post(
    "/manufactured-products",
    requireEffectiveBulkPermissionKey("admin.bulk.manufactured_products"),
    async (req, res, next) => {
      try {
        const parsed = BulkMpSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
          return;
        }
        const created: Array<{ index: number; id: string }> = [];
        const errors: Array<{ index: number; message: string }> = [];
        for (let i = 0; i < parsed.data.items.length; i++) {
          const it = parsed.data.items[i]!;
          try {
            const data = {
              code: strOrNull(it.code),
              name: it.name,
              description: strOrNull(it.description),
              priceRub: numOrNull(it.priceRub),
              costRub: numOrNull(it.costRub),
              notes: strOrNull(it.notes),
              isActive: it.isActive ?? true,
            };
            if (it.id) {
              const row = await prisma.manufacturedProduct.update({ where: { id: it.id }, data });
              created.push({ index: i, id: row.id });
            } else {
              const row = await prisma.manufacturedProduct.create({ data });
              created.push({ index: i, id: row.id });
            }
          } catch (e: unknown) {
            errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
          }
        }
        res.json({ ok: errors.length === 0, created, errors });
      } catch (e) {
        next(e);
      }
    },
  );

  bulkRouter.post("/complexes", requireEffectiveBulkPermissionKey("admin.bulk.complexes"), async (req, res, next) => {
    try {
      const parsed = BulkCxSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const data = {
            name: it.name,
            code: strOrNull(it.code),
            description: strOrNull(it.description),
            isActive: it.isActive ?? true,
          };
          if (it.id) {
            const row = await prisma.complex.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const row = await prisma.complex.create({ data });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.post("/catalog-products", requireEffectiveBulkPermissionKey("admin.bulk.catalog_products"), async (req, res, next) => {
    try {
      const parsed = BulkCatProdSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: "invalid_body", details: parsed.error.flatten() });
        return;
      }
      const created: Array<{ index: number; id: string }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (let i = 0; i < parsed.data.items.length; i++) {
        const it = parsed.data.items[i]!;
        try {
          const cx = await prisma.complex.findUnique({ where: { id: it.complexId } });
          if (!cx) {
            errors.push({ index: i, message: "invalid_complex" });
            continue;
          }
          const data = {
            complexId: it.complexId,
            name: it.name,
            code: strOrNull(it.code),
            description: strOrNull(it.description),
            price: new Prisma.Decimal(it.price),
            isActive: it.isActive ?? true,
          };
          if (it.id) {
            const row = await prisma.product.update({ where: { id: it.id }, data });
            created.push({ index: i, id: row.id });
          } else {
            const row = await prisma.product.create({ data });
            created.push({ index: i, id: row.id });
          }
        } catch (e: unknown) {
          errors.push({ index: i, message: e instanceof Error ? e.message : "failed" });
        }
      }
      res.json({ ok: errors.length === 0, created, errors });
    } catch (e) {
      next(e);
    }
  });

  bulkRouter.get("/clients/export", requireEffectiveBulkPermissionKey("admin.bulk.clients"), async (_req, res, next) => {
    try {
      res.json(await exportBulkClients());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/organizations/export", requireEffectiveBulkPermissionKey("admin.bulk.organizations"), async (_req, res, next) => {
    try {
      res.json(await exportBulkOrganizations());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/kp-photos/export", requireEffectiveBulkPermissionKey("admin.bulk.kp_photos"), async (_req, res, next) => {
    try {
      res.json(await exportBulkKpPhotos());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/users/export", requireEffectiveBulkPermissionKey("admin.bulk.users"), async (_req, res, next) => {
    try {
      res.json(await exportBulkUsers());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/production-details/export", requireEffectiveBulkPermissionKey("admin.bulk.production_details"), async (_req, res, next) => {
    try {
      res.json(await exportBulkProductionDetails());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/manufactured-products/export", requireEffectiveBulkPermissionKey("admin.bulk.manufactured_products"), async (_req, res, next) => {
    try {
      res.json(await exportBulkManufacturedProducts());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/complexes/export", requireEffectiveBulkPermissionKey("admin.bulk.complexes"), async (_req, res, next) => {
    try {
      res.json(await exportBulkComplexes());
    } catch (e) {
      next(e);
    }
  });
  bulkRouter.get("/catalog-products/export", requireEffectiveBulkPermissionKey("admin.bulk.catalog_products"), async (_req, res, next) => {
    try {
      res.json(await exportBulkCatalogProducts());
    } catch (e) {
      next(e);
    }
  });
}
