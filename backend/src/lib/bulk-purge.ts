import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Сегмент пути `DELETE /api/bulk/:segment/all` (как у POST/GET export). */
export type BulkPurgeSegment =
  | "units"
  | "colors"
  | "surface-finishes"
  | "coatings"
  | "geometries"
  | "material-characteristics"
  | "materials"
  | "production-work-types"
  | "roles"
  | "trade-goods"
  | "clients"
  | "organizations"
  | "kp-photos"
  | "users"
  | "production-details"
  | "manufactured-products";

export function isBulkPurgeSegment(s: string): s is BulkPurgeSegment {
  return (
    s === "units" ||
    s === "colors" ||
    s === "surface-finishes" ||
    s === "coatings" ||
    s === "geometries" ||
    s === "material-characteristics" ||
    s === "materials" ||
    s === "production-work-types" ||
    s === "roles" ||
    s === "trade-goods" ||
    s === "clients" ||
    s === "organizations" ||
    s === "kp-photos" ||
    s === "users" ||
    s === "production-details" ||
    s === "manufactured-products"
  );
}

/** Ключ матрицы `admin.bulk.*` — как у POST/GET для того же сегмента. */
export function bulkPurgeSegmentToPermissionKey(segment: BulkPurgeSegment): string {
  const m: Record<BulkPurgeSegment, string> = {
    units: "admin.bulk.units",
    colors: "admin.bulk.colors",
    "surface-finishes": "admin.bulk.surface_finishes",
    coatings: "admin.bulk.coatings",
    geometries: "admin.bulk.geometries",
    "material-characteristics": "admin.bulk.material_characteristics",
    materials: "admin.bulk.materials",
    "production-work-types": "admin.bulk.production_work_types",
    roles: "admin.bulk.roles",
    "trade-goods": "admin.bulk.trade_goods",
    clients: "admin.bulk.clients",
    organizations: "admin.bulk.organizations",
    "kp-photos": "admin.bulk.kp_photos",
    users: "admin.bulk.users",
    "production-details": "admin.bulk.production_details",
    "manufactured-products": "admin.bulk.manufactured_products",
  };
  return m[segment];
}

/**
 * Полное удаление всех строк таблицы (deleteMany).
 * При нарушении FK Prisma выбросит P2003 / P2014 — обработать на уровне роута.
 */
export async function purgeBulkSegment(segment: BulkPurgeSegment): Promise<{ deleted: number }> {
  switch (segment) {
    case "units":
      return { deleted: (await prisma.unit.deleteMany()).count };
    case "colors":
      return { deleted: (await prisma.color.deleteMany()).count };
    case "surface-finishes":
      return { deleted: (await prisma.surfaceFinish.deleteMany()).count };
    case "coatings":
      return { deleted: (await prisma.coating.deleteMany()).count };
    case "geometries":
      return { deleted: (await prisma.geometry.deleteMany()).count };
    case "material-characteristics":
      return { deleted: (await prisma.materialCharacteristic.deleteMany()).count };
    case "materials":
      return { deleted: (await prisma.material.deleteMany()).count };
    case "production-work-types":
      return { deleted: (await prisma.productionWorkType.deleteMany()).count };
    case "roles": {
      const anchor =
        (await prisma.role.findFirst({
          where: { isSystem: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        })) ??
        (await prisma.role.findFirst({
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        }));
      if (!anchor) {
        return { deleted: 0 };
      }
      await prisma.user.updateMany({ data: { roleId: anchor.id } });
      const deleted = await prisma.role.deleteMany({
        where: { id: { not: anchor.id } },
      });
      return { deleted: deleted.count };
    }
    case "trade-goods":
      return { deleted: (await prisma.tradeGood.deleteMany()).count };
    case "clients": {
      await prisma.commercialOffer.deleteMany({ where: { clientId: { not: null } } });
      await prisma.organizationContact.deleteMany({});
      return { deleted: (await prisma.client.deleteMany()).count };
    }
    case "organizations": {
      await prisma.commercialOffer.deleteMany({ where: { organizationId: { not: null } } });
      await prisma.kpPhoto.deleteMany({});
      await prisma.material.updateMany({ data: { supplierOrganizationId: null } });
      return { deleted: (await prisma.organization.deleteMany()).count };
    }
    case "kp-photos":
      return { deleted: (await prisma.kpPhoto.deleteMany()).count };
    case "users": {
      const anchor =
        (await prisma.user.findFirst({ where: { login: "admin" } })) ??
        (await prisma.user.findFirst({ orderBy: { id: "asc" } }));
      if (!anchor) {
        return { deleted: 0 };
      }
      return { deleted: (await prisma.user.deleteMany({ where: { id: { not: anchor.id } } })).count };
    }
    case "production-details": {
      await prisma.productLine.deleteMany({});
      return { deleted: (await prisma.productionDetail.deleteMany()).count };
    }
    case "manufactured-products": {
      await prisma.tradeGoodLine.deleteMany({});
      return { deleted: (await prisma.manufacturedProduct.deleteMany()).count };
    }
  }
}

export function isPrismaForeignKeyBlock(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014");
}
