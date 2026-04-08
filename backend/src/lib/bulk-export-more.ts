import { prisma } from "./prisma.js";
import { withSkeletonIfEmpty } from "./bulk-skeleton.js";

const skClient = {
  lastName: "",
  firstName: "",
  patronymic: "",
  phone: "",
  address: "",
  email: "",
  notes: "",
  clientMarkupPercent: null as number | null,
  isActive: true,
  passportSeries: "",
  passportNumber: "",
  passportIssuedBy: "",
  passportIssuedDate: "",
};

export async function exportBulkClients() {
  const rows = await prisma.client.findMany({ orderBy: { lastName: "asc" } });
  const items = rows.map((r) => ({
    lastName: r.lastName,
    firstName: r.firstName,
    patronymic: r.patronymic,
    phone: r.phone,
    address: r.address,
    email: r.email,
    notes: r.notes,
    clientMarkupPercent: r.clientMarkupPercent,
    isActive: r.isActive,
    passportSeries: r.passportSeries,
    passportNumber: r.passportNumber,
    passportIssuedBy: r.passportIssuedBy,
    passportIssuedDate: r.passportIssuedDate,
  }));
  return withSkeletonIfEmpty(items, skClient);
}

const skOrg = {
  name: "",
  shortName: "",
  legalForm: "",
  inn: "",
  kpp: "",
  ogrn: "",
  okpo: "",
  phone: "",
  email: "",
  website: "",
  legalAddress: "",
  postalAddress: "",
  bankName: "",
  bankBik: "",
  bankAccount: "",
  bankCorrAccount: "",
  signerName: "",
  signerPosition: "",
  notes: "",
  country: "",
  parentCounterparty: "",
  createdAtSource: "",
  registrationDate: "",
  taxIdExtended: "",
  kppExtended: "",
  isBranch: false,
  isInnValid: false,
  isKppValid: false,
  isGovernmentBody: false,
  documentRef: "",
  certificateSeriesNumber: "",
  certificateIssuedDate: "",
  governmentBodyType: "",
  governmentBodyCode: "",
  isActive: true,
};

export async function exportBulkOrganizations() {
  const rows = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    shortName: r.shortName ?? "",
    legalForm: r.legalForm ?? "",
    inn: r.inn ?? "",
    kpp: r.kpp ?? "",
    ogrn: r.ogrn ?? "",
    okpo: r.okpo ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    website: r.website ?? "",
    legalAddress: r.legalAddress ?? "",
    postalAddress: r.postalAddress ?? "",
    bankName: r.bankName ?? "",
    bankBik: r.bankBik ?? "",
    bankAccount: r.bankAccount ?? "",
    bankCorrAccount: r.bankCorrAccount ?? "",
    signerName: r.signerName ?? "",
    signerPosition: r.signerPosition ?? "",
    notes: r.notes ?? "",
    country: r.country,
    parentCounterparty: r.parentCounterparty,
    createdAtSource: r.createdAtSource,
    registrationDate: r.registrationDate,
    taxIdExtended: r.taxIdExtended,
    kppExtended: r.kppExtended,
    isBranch: r.isBranch,
    isInnValid: r.isInnValid,
    isKppValid: r.isKppValid,
    isGovernmentBody: r.isGovernmentBody,
    documentRef: r.documentRef,
    certificateSeriesNumber: r.certificateSeriesNumber,
    certificateIssuedDate: r.certificateIssuedDate,
    governmentBodyType: r.governmentBodyType,
    governmentBodyCode: r.governmentBodyCode,
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skOrg);
}

const skKp = {
  name: "",
  organizationId: "",
  photoTitle: "",
  photoFileName: "",
  photoUrl: "",
  isActive: true,
};

export async function exportBulkKpPhotos() {
  const rows = await prisma.kpPhoto.findMany({
    orderBy: [{ organizationId: "asc" }, { name: "asc" }],
  });
  const items = rows.map((r) => ({
    name: r.name,
    organizationId: r.organizationId,
    photoTitle: r.photoTitle,
    photoFileName: r.photoFileName ?? "",
    photoUrl: r.photoUrl ?? "",
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skKp);
}

const skUser = {
  login: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  roleId: "",
};

export async function exportBulkUsers() {
  const rows = await prisma.user.findMany({ orderBy: { login: "asc" } });
  const items = rows.map((r) => ({
    login: r.login,
    password: "",
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    roleId: r.roleId,
  }));
  return withSkeletonIfEmpty(items, skUser);
}

const skPd = {
  name: "",
  code: "",
  qty: 1,
  notes: "",
  isActive: true,
  sourceMaterialId: "",
  sourceWorkTypeId: "",
  snapshotMaterialName: "",
  snapshotMaterialCode: "",
  snapshotUnitCode: "",
  snapshotUnitName: "",
  snapshotPurchasePriceRub: null as number | null,
  snapshotDensityKgM3: null as number | null,
  snapshotHeightMm: null as number | null,
  snapshotLengthMm: null as number | null,
  snapshotWidthMm: null as number | null,
  snapshotDiameterMm: null as number | null,
  snapshotThicknessMm: null as number | null,
  snapshotCharacteristicName: "",
  snapshotWorkTypeName: "",
  snapshotWorkShortLabel: "",
  snapshotHourlyRateRub: null as number | null,
  workTimeHours: null as number | null,
};

export async function exportBulkProductionDetails() {
  const rows = await prisma.productionDetail.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    code: r.code ?? "",
    qty: r.qty,
    notes: r.notes ?? "",
    isActive: r.isActive,
    sourceMaterialId: r.sourceMaterialId ?? "",
    sourceWorkTypeId: r.sourceWorkTypeId ?? "",
    snapshotMaterialName: r.snapshotMaterialName ?? "",
    snapshotMaterialCode: r.snapshotMaterialCode ?? "",
    snapshotUnitCode: r.snapshotUnitCode ?? "",
    snapshotUnitName: r.snapshotUnitName ?? "",
    snapshotPurchasePriceRub: r.snapshotPurchasePriceRub,
    snapshotDensityKgM3: r.snapshotDensityKgM3,
    snapshotHeightMm: r.snapshotHeightMm,
    snapshotLengthMm: r.snapshotLengthMm,
    snapshotWidthMm: r.snapshotWidthMm,
    snapshotDiameterMm: r.snapshotDiameterMm,
    snapshotThicknessMm: r.snapshotThicknessMm,
    snapshotCharacteristicName: r.snapshotCharacteristicName ?? "",
    snapshotWorkTypeName: r.snapshotWorkTypeName ?? "",
    snapshotWorkShortLabel: r.snapshotWorkShortLabel ?? "",
    snapshotHourlyRateRub: r.snapshotHourlyRateRub,
    workTimeHours: r.workTimeHours,
  }));
  return withSkeletonIfEmpty(items, skPd);
}

const skMp = {
  code: "",
  name: "",
  description: "",
  priceRub: null as number | null,
  costRub: null as number | null,
  notes: "",
  isActive: true,
};

export async function exportBulkManufacturedProducts() {
  const rows = await prisma.manufacturedProduct.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    code: r.code ?? "",
    name: r.name,
    description: r.description ?? "",
    priceRub: r.priceRub,
    costRub: r.costRub,
    notes: r.notes ?? "",
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skMp);
}

const skCx = {
  name: "",
  code: "",
  description: "",
  isActive: true,
};

export async function exportBulkComplexes() {
  const rows = await prisma.complex.findMany({ orderBy: { name: "asc" } });
  const items = rows.map((r) => ({
    name: r.name,
    code: r.code ?? "",
    description: r.description ?? "",
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skCx);
}

const skCatP = {
  complexId: "",
  name: "",
  code: "",
  description: "",
  price: 0,
  isActive: true,
};

export async function exportBulkCatalogProducts() {
  const rows = await prisma.product.findMany({ orderBy: [{ complexId: "asc" }, { name: "asc" }] });
  const items = rows.map((r) => ({
    complexId: r.complexId,
    name: r.name,
    code: r.code ?? "",
    description: r.description ?? "",
    price: Number(r.price),
    isActive: r.isActive,
  }));
  return withSkeletonIfEmpty(items, skCatP);
}
