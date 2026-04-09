type OfferListShape = {
  id: string;
  number: string | null;
  title: string | null;
  status: string;
  currentStatusKey: string;
  organizationId: string | null;
  clientId: string | null;
  organizationContactId: string | null;
  recipient: string | null;
  validUntil: Date | null;
  currency: string;
  prepaymentPercent: number;
  productionLeadDays: number;
  vatPercent: number;
  vatAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization: null;
  client: null;
  organizationContact: null;
  lines: unknown[];
  printEvents: unknown[];
};

export function makeOfferForRoute(overrides: Partial<OfferListShape> = {}): OfferListShape {
  return {
    id: "offer-1",
    number: "КП-000123",
    title: "Тест",
    status: "SENT",
    currentStatusKey: "proposal_waiting",
    organizationId: null,
    clientId: null,
    organizationContactId: null,
    recipient: "ООО Тест",
    validUntil: null,
    currency: "RUB",
    prepaymentPercent: 80,
    productionLeadDays: 30,
    vatPercent: 22,
    vatAmount: 0,
    subtotalAmount: 0,
    totalAmount: 0,
    notes: null,
    createdAt: new Date("2026-04-10T00:00:00.000Z"),
    updatedAt: new Date("2026-04-10T00:00:00.000Z"),
    organization: null,
    client: null,
    organizationContact: null,
    lines: [],
    printEvents: [],
    ...overrides,
  };
}

export function makeOfferDeleteProbe(overrides: { currentStatusKey?: string; order?: { id: string; orderNumber: string } | null } = {}) {
  return {
    currentStatusKey: overrides.currentStatusKey ?? "proposal_draft",
    order: overrides.order ?? null,
  };
}
