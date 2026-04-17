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

export type OfferNotesJson = {
  extraTexts: string[];
  legacyNoteText?: string;
  validityDays?: number;
  extraTextsTopPx?: number;
};

export type ParsedOfferNotes = {
  extraTexts: string[];
  legacyNoteText: string | null;
  validityDays: number;
  extraTextsTopPx: number;
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

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function hasNotesShape(value: unknown): value is Partial<OfferNotesJson> {
  return typeof value === 'object' && value !== null;
}

export function parseOfferNotes(raw: string | null | undefined): ParsedOfferNotes {
  const input = String(raw ?? '').trim();
  if (!input) {
    return { extraTexts: [], legacyNoteText: null, validityDays: 10, extraTextsTopPx: 800 };
  }
  try {
    const parsed: unknown = JSON.parse(input);
    if (!hasNotesShape(parsed)) {
      return { extraTexts: [], legacyNoteText: input, validityDays: 10, extraTextsTopPx: 800 };
    }
    const extraTexts = parseStringArray(parsed.extraTexts);
    const legacyRaw = typeof parsed.legacyNoteText === 'string' ? parsed.legacyNoteText.trim() : '';
    const validityRaw = Number((parsed as OfferNotesJson).validityDays);
    const validityDays = Number.isFinite(validityRaw) && validityRaw > 0 ? Math.trunc(validityRaw) : 10;
    const topRaw = Number((parsed as OfferNotesJson).extraTextsTopPx);
    const extraTextsTopPx = Number.isFinite(topRaw) ? Math.min(2000, Math.max(0, Math.trunc(topRaw))) : 800;
    return { extraTexts, legacyNoteText: legacyRaw || null, validityDays, extraTextsTopPx };
  } catch {
    return { extraTexts: [], legacyNoteText: input, validityDays: 10, extraTextsTopPx: 800 };
  }
}

export function stringifyOfferNotes(notes: ParsedOfferNotes): string | null {
  const extraTexts = parseStringArray(notes.extraTexts);
  const legacy = String(notes.legacyNoteText ?? '').trim();
  const validityRaw = Number(notes.validityDays);
  const validityDays = Number.isFinite(validityRaw) && validityRaw > 0 ? Math.trunc(validityRaw) : 10;
  const topRaw = Number(notes.extraTextsTopPx);
  const extraTextsTopPx = Number.isFinite(topRaw) ? Math.min(2000, Math.max(0, Math.trunc(topRaw))) : 800;
  if (extraTexts.length === 0 && !legacy && validityDays === 10 && extraTextsTopPx === 800) {
    return null;
  }
  const payload: OfferNotesJson = {
    extraTexts,
    ...(legacy ? { legacyNoteText: legacy } : {}),
    ...(validityDays !== 10 ? { validityDays } : {}),
    ...(extraTextsTopPx !== 800 ? { extraTextsTopPx } : {}),
  };
  return JSON.stringify(payload);
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
