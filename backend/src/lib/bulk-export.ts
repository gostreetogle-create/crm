import { prisma } from "./prisma.js";
import { withSkeletonIfEmpty } from "./bulk-skeleton.js";

const skUnit = {
  name: "",
  code: "",
  notes: "",
  isActive: true,
};

const skColor = {
  name: "",
  hex: "",
  rgbR: 0,
  rgbG: 0,
  rgbB: 0,
  ralCode: null as string | null,
};

const skSurfaceFinish = {
  finishType: "",
  roughnessClass: "",
  raMicron: null as number | null,
};

const skCoating = {
  coatingType: "",
  coatingSpec: "",
  thicknessMicron: null as number | null,
};

const skGeometry = {
  name: "",
  shapeKey: "",
  heightMm: null as number | null,
  lengthMm: null as number | null,
  widthMm: null as number | null,
  diameterMm: null as number | null,
  thicknessMm: null as number | null,
  notes: null as string | null,
  isActive: true,
};

const skMaterialCharacteristic = {
  name: "",
  code: null as string | null,
  densityKgM3: null as number | null,
  colorId: null as string | null,
  colorName: null as string | null,
  colorHex: null as string | null,
  surfaceFinishId: null as string | null,
  finishType: null as string | null,
  roughnessClass: null as string | null,
  raMicron: null as number | null,
  coatingId: null as string | null,
  coatingType: null as string | null,
  coatingSpec: null as string | null,
  coatingThicknessMicron: null as number | null,
  notes: null as string | null,
  isActive: true,
};

const skMaterial = {
  name: "",
  code: null as string | null,
  materialCharacteristicId: "",
  geometryId: "",
  unitId: null as string | null,
  supplierOrganizationId: null as string | null,
  purchasePriceRub: null as number | null,
  notes: null as string | null,
  isActive: true,
};

const skProductionWorkType = {
  name: "",
  shortLabel: "",
  hourlyRateRub: 0,
  isActive: true,
};

const skRole = {
  id: "",
  code: "",
  name: "",
  sortOrder: 0,
  notes: "",
  isActive: true,
  isSystem: false,
};

const skTradeGood = {
  code: "",
  name: "",
  description: "",
  category: "",
  subcategory: "",
  unitCode: "",
  priceRub: null as number | null,
  costRub: null as number | null,
  notes: "",
  isActive: true,
  lines: [{ productId: "", productCode: "", qty: 1 }],
};

/** Тело для скачивания: тот же формат, что ожидает POST массового импорта. При пустой БД — один объект-шаблон с пустыми полями. */
export async function exportBulkUnits() {
  const rows = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    code: r.code ?? "",
    notes: r.notes ?? "",
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skUnit);
}

export async function exportBulkColors() {
  const rows = await prisma.color.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    hex: r.hex,
    rgbR: r.rgbR,
    rgbG: r.rgbG,
    rgbB: r.rgbB,
    ralCode: r.ralCode,
  }));
  return withSkeletonIfEmpty(items, skColor);
}

export async function exportBulkSurfaceFinishes() {
  const rows = await prisma.surfaceFinish.findMany({ orderBy: { finishType: "asc" } });
  const items = rows.map((r) => ({
    finishType: r.finishType,
    roughnessClass: r.roughnessClass,
    raMicron: r.raMicron,
  }));
  return withSkeletonIfEmpty(items, skSurfaceFinish);
}

export async function exportBulkCoatings() {
  const rows = await prisma.coating.findMany({ orderBy: { coatingType: "asc" } });
  const items = rows.map((r) => ({
    coatingType: r.coatingType,
    coatingSpec: r.coatingSpec,
    thicknessMicron: r.thicknessMicron,
  }));
  return withSkeletonIfEmpty(items, skCoating);
}

export async function exportBulkGeometries() {
  const rows = await prisma.geometry.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    shapeKey: r.shapeKey,
    heightMm: r.heightMm,
    lengthMm: r.lengthMm,
    widthMm: r.widthMm,
    diameterMm: r.diameterMm,
    thicknessMm: r.thicknessMm,
    notes: r.notes,
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skGeometry);
}

export async function exportBulkMaterialCharacteristics() {
  const rows = await prisma.materialCharacteristic.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    code: r.code,
    densityKgM3: r.densityKgM3,
    colorId: r.colorId,
    colorName: r.colorName,
    colorHex: r.colorHex,
    surfaceFinishId: r.surfaceFinishId,
    finishType: r.finishType,
    roughnessClass: r.roughnessClass,
    raMicron: r.raMicron,
    coatingId: r.coatingId,
    coatingType: r.coatingType,
    coatingSpec: r.coatingSpec,
    coatingThicknessMicron: r.coatingThicknessMicron,
    notes: r.notes,
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skMaterialCharacteristic);
}

export async function exportBulkMaterials() {
  const rows = await prisma.material.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    code: r.code,
    materialCharacteristicId: r.materialCharacteristicId,
    geometryId: r.geometryId,
    unitId: r.unitId,
    supplierOrganizationId: r.supplierOrganizationId,
    purchasePriceRub: r.purchasePriceRub,
    notes: r.notes,
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skMaterial);
}

export async function exportBulkProductionWorkTypes() {
  const rows = await prisma.productionWorkType.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    shortLabel: r.shortLabel,
    hourlyRateRub: r.hourlyRateRub,
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skProductionWorkType);
}

export async function exportBulkRoles() {
  const rows = await prisma.role.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] });
  const items = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    sortOrder: r.sortOrder,
    notes: r.notes ?? "",
    isActive: r.isActive,
    isSystem: r.isSystem,
  }));
  return withSkeletonIfEmpty(items, skRole);
}

export async function exportBulkTradeGoods() {
  const rows = await prisma.tradeGood.findMany({
    orderBy: { name: "asc" },
    include: {
      lines: { orderBy: { sortOrder: "asc" }, include: { product: { select: { code: true } } } },
      category: true,
      subcategory: true,
    },
  });
  const items = rows.map((g) => ({
    code: g.code ?? "",
    name: g.name,
    description: g.description ?? "",
    category: g.category?.name ?? "",
    subcategory: g.subcategory?.name ?? "",
    unitCode: g.unitCode ?? "",
    priceRub: g.priceRub,
    costRub: g.costRub,
    notes: g.notes ?? "",
    isActive: g.isActive,
    lines: g.lines.map((l) => ({
      productId: l.productId,
      productCode: l.product?.code ?? "",
      qty: l.qty,
    })),
  }));
  return withSkeletonIfEmpty(items, skTradeGood);
}
