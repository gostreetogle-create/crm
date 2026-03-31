/**
 * Сборка DTO из значений форм (без доступа к store), вынесено из `dictionaries-page.ts`.
 */
import type { MaterialItemInput } from '@srm/materials-data-access';
import type { MaterialCharacteristicItemInput } from '@srm/material-characteristics-data-access';
import type { ClientItemInput } from '@srm/clients-data-access';
import type { OrganizationItemInput } from '@srm/organizations-data-access';
import { normalizeRalCode, organizationKindToLegalForm } from './dictionaries-page-form-utils';

function roundedMoney(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function workTypesPayloadFromValues(v: {
  name: string;
  shortLabel: string;
  hourlyRateRub: unknown;
  isActive: boolean;
}): { name: string; shortLabel: string; hourlyRateRub: number; isActive: boolean } {
  return {
    name: v.name.trim(),
    shortLabel: v.shortLabel.trim(),
    hourlyRateRub: roundedMoney(v.hourlyRateRub),
    isActive: v.isActive,
  };
}

export function materialsPayloadFromValues(v: {
  name: string;
  code: string;
  materialCharacteristicId: string;
  geometryId: string;
  geometryName?: string;
  unitId: string | undefined;
  unitName?: string;
  purchasePriceRub: unknown;
  notes: string;
  isActive: boolean;
}): MaterialItemInput {
  return {
    name: v.name.trim(),
    code: v.code.trim() || undefined,
    materialCharacteristicId: v.materialCharacteristicId,
    geometryId: v.geometryId,
    geometryName: v.geometryName,
    unitId: v.unitId || undefined,
    unitName: v.unitName,
    purchasePriceRub: roundedMoney(v.purchasePriceRub),
    notes: v.notes.trim() || undefined,
    isActive: v.isActive,
  };
}

export function materialCharacteristicsPayloadFromValues(v: {
  name: string;
  code: string;
  densityKgM3: number | null;
  colorId: string;
  colorName: string;
  colorHex: string;
  surfaceFinishId: string;
  finishType: string;
  roughnessClass: string;
  raMicron: number | null;
  coatingId: string;
  coatingType: string;
  coatingSpec: string;
  coatingThicknessMicron: number | null;
  notes: string;
  isActive: boolean;
}): MaterialCharacteristicItemInput {
  return {
    name: v.name.trim(),
    code: v.code.trim() || undefined,
    densityKgM3: v.densityKgM3 ?? undefined,
    colorId: v.colorId || undefined,
    colorName: v.colorName.trim() || undefined,
    colorHex: v.colorHex.trim() || undefined,
    surfaceFinishId: v.surfaceFinishId || undefined,
    finishType: v.finishType.trim() || undefined,
    roughnessClass: v.roughnessClass.trim() || undefined,
    raMicron: v.raMicron ?? undefined,
    coatingId: v.coatingId || undefined,
    coatingType: v.coatingType.trim() || undefined,
    coatingSpec: v.coatingSpec.trim() || undefined,
    coatingThicknessMicron: v.coatingThicknessMicron ?? undefined,
    notes: v.notes.trim() || undefined,
    isActive: v.isActive,
  };
}

export function geometriesPayloadFromValues(v: {
  name: string;
  shapeKey: string;
  heightMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  diameterMm: number | null;
  thicknessMm: number | null;
  notes: string;
  isActive: boolean;
}) {
  return {
    name: v.name.trim(),
    shapeKey: v.shapeKey,
    heightMm: v.heightMm ?? undefined,
    lengthMm: v.lengthMm ?? undefined,
    widthMm: v.widthMm ?? undefined,
    diameterMm: v.diameterMm ?? undefined,
    thicknessMm: v.thicknessMm ?? undefined,
    notes: v.notes.trim() || undefined,
    isActive: v.isActive,
  };
}

export function unitsPayloadFromValues(v: {
  name: string;
  code: string;
  notes: string;
  isActive: boolean;
}) {
  return {
    name: v.name.trim(),
    code: v.code.trim(),
    notes: v.notes.trim() || undefined,
    isActive: v.isActive,
  };
}

export function colorsPayloadFromFormRaw(value: {
  ralCode: string;
  name: string;
  hex: string;
}): {
  ralCode: string | undefined;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
} {
  const normalizedHex = /^#([A-Fa-f0-9]{6})$/.test(value.hex)
    ? value.hex.toUpperCase()
    : '#000000';
  const normalizedRalCode = normalizeRalCode(value.ralCode);
  return {
    ralCode: normalizedRalCode,
    name: value.name.trim(),
    hex: normalizedHex,
    rgb: {
      r: Number.parseInt(normalizedHex.slice(1, 3), 16),
      g: Number.parseInt(normalizedHex.slice(3, 5), 16),
      b: Number.parseInt(normalizedHex.slice(5, 7), 16),
    },
  };
}

export function surfaceFinishPayloadFromValues(v: {
  finishType: string;
  roughnessClass: string;
  raMicron: number | null;
}) {
  return {
    finishType: v.finishType.trim(),
    roughnessClass: v.roughnessClass.trim(),
    raMicron: v.raMicron ?? undefined,
  };
}

export function coatingPayloadFromValues(v: {
  coatingType: string;
  coatingSpec: string;
  thicknessMicron: number | null;
}) {
  return {
    coatingType: v.coatingType.trim(),
    coatingSpec: v.coatingSpec.trim(),
    thicknessMicron: v.thicknessMicron ?? undefined,
  };
}

export function clientPayloadFromForm(
  v: {
    lastName: string;
    firstName: string;
    patronymic: string;
    address: string;
    phone: string;
    email: string;
    notes: string;
    passportSeries: string;
    passportNumber: string;
    passportIssuedBy: string;
    passportIssuedDate: string;
    isActive: boolean;
  },
  clientMarkupPercent: number | null,
): ClientItemInput {
  return {
    lastName: v.lastName.trim(),
    firstName: v.firstName.trim(),
    patronymic: v.patronymic.trim(),
    address: v.address.trim(),
    phone: v.phone.trim(),
    email: v.email.trim(),
    notes: v.notes.trim(),
    clientMarkupPercent,
    passportSeries: v.passportSeries.trim(),
    passportNumber: v.passportNumber.trim(),
    passportIssuedBy: v.passportIssuedBy.trim(),
    passportIssuedDate: v.passportIssuedDate.trim(),
    isActive: v.isActive,
  };
}

export function organizationsPayloadFromFields(input: {
  organizationKind: 'OOO' | 'IP';
  selectedContactIds: string[];
  contactLabelsById: Map<string, string>;
  name: string;
  shortName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  okpo: string;
  phone: string;
  email: string;
  website: string;
  legalAddress: string;
  postalAddress: string;
  bankName: string;
  bankBik: string;
  bankAccount: string;
  bankCorrAccount: string;
  signerName: string;
  signerPosition: string;
  notes: string;
  isActive: boolean;
}): OrganizationItemInput {
  const legalForm = organizationKindToLegalForm(input.organizationKind);
  const selectedContactIds = input.selectedContactIds;
  return {
    name: input.name.trim(),
    shortName: input.shortName.trim() || undefined,
    legalForm,
    inn: input.inn.trim() || undefined,
    kpp: input.organizationKind === 'IP' ? undefined : input.kpp.trim() || undefined,
    ogrn: input.ogrn.trim() || undefined,
    okpo: input.okpo.trim() || undefined,
    phone: input.phone.trim() || undefined,
    email: input.email.trim() || undefined,
    website: input.website.trim() || undefined,
    legalAddress: input.legalAddress.trim() || undefined,
    postalAddress: input.postalAddress.trim() || undefined,
    bankName: input.bankName.trim() || undefined,
    bankBik: input.bankBik.trim() || undefined,
    bankAccount: input.bankAccount.trim() || undefined,
    bankCorrAccount: input.bankCorrAccount.trim() || undefined,
    signerName: input.signerName.trim() || undefined,
    signerPosition: input.signerPosition.trim() || undefined,
    notes: input.notes.trim() || undefined,
    isActive: input.isActive,
    contactIds: selectedContactIds,
    contactLabels: selectedContactIds.map((id) => input.contactLabelsById.get(id) ?? id),
  };
}
