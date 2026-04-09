import { normalizeCommercialOfferStatusKey, type ProposalStatusKey } from './commercial-offer-status.rules';

export type CommercialOfferLineDto = {
  lineNo?: number | null;
  name?: string | null;
  description?: string | null;
  qty?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  imageUrl?: string | null;
  catalogProductId?: string | null;
  sortOrder?: number | null;
};

export type CommercialOfferDto = {
  id: string;
  number?: string | null;
  title?: string | null;
  createdAt?: string | null;
  prepaymentPercent?: number | null;
  productionLeadDays?: number | null;
  currentStatusKey?: string | null;
  organizationId?: string | null;
  clientId?: string | null;
  organizationContactId?: string | null;
  recipient?: string | null;
  validUntil?: string | null;
  currency?: string | null;
  vatPercent?: number | null;
  vatAmount?: number | null;
  notes?: string | null;
  lines?: CommercialOfferLineDto[] | null;
};

export type CommercialOfferPayload = {
  number: string | null;
  title?: string | null;
  currentStatusKey: ProposalStatusKey;
  organizationId: string | null;
  clientId?: string | null;
  organizationContactId: string | null;
  recipient: string | null;
  validUntil?: string | null;
  currency?: string | null;
  vatPercent: number;
  vatAmount: number;
  prepaymentPercent?: number;
  productionLeadDays?: number;
  notes?: string | null;
  skipCatalogSync: boolean;
  lines: Array<{
    lineNo: number;
    name: string;
    description: string | null;
    qty: number;
    unit: string;
    unitPrice: number;
    imageUrl: string | null;
    catalogProductId: string | null;
    sortOrder: number;
  }>;
};

function toNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toTrimmed(value: unknown): string {
  return String(value ?? '').trim();
}

export function mapOfferDtoToPayload(source: CommercialOfferDto, options?: { copyTitle?: boolean; skipCatalogSync?: boolean }): CommercialOfferPayload {
  const copyTitle = Boolean(options?.copyTitle);
  const sourceTitle = toTrimmed(source.title);
  return {
    number: null,
    title: copyTitle && sourceTitle ? `${sourceTitle} (копия)` : source.title?.trim() || null,
    currentStatusKey: 'proposal_draft',
    organizationId: toTrimmed(source.organizationId) || null,
    clientId: toTrimmed(source.clientId) || null,
    organizationContactId: toTrimmed(source.organizationContactId) || null,
    recipient: toTrimmed(source.recipient) || null,
    validUntil: toTrimmed(source.validUntil) || null,
    currency: toTrimmed(source.currency) || 'RUB',
    vatPercent: toNumber(source.vatPercent, 22),
    vatAmount: toNumber(source.vatAmount, 0),
    prepaymentPercent: toNumber(source.prepaymentPercent, 80),
    productionLeadDays: toNumber(source.productionLeadDays, 30),
    notes: toTrimmed(source.notes) || null,
    skipCatalogSync: Boolean(options?.skipCatalogSync),
    lines: (source.lines ?? []).map((line, idx) => ({
      lineNo: idx + 1,
      name: toTrimmed(line.name),
      description: toTrimmed(line.description) || null,
      qty: toNumber(line.qty, 0),
      unit: toTrimmed(line.unit) || 'шт.',
      unitPrice: toNumber(line.unitPrice, 0),
      imageUrl: toTrimmed(line.imageUrl) || null,
      catalogProductId: toTrimmed(line.catalogProductId) || null,
      sortOrder: idx,
    })),
  };
}

export function mapOfferStatus(raw: unknown): ProposalStatusKey {
  return normalizeCommercialOfferStatusKey(raw);
}
