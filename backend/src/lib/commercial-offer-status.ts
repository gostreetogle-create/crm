import * as Prisma from "@prisma/client";

export const STATUS_KEYS = [
  "proposal_draft",
  "proposal_waiting",
  "proposal_paid",
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

const LEGACY_APPROVED_KEY = "proposal_approved";

export const ALLOWED_TRANSITIONS: Record<StatusKey, readonly StatusKey[]> = {
  proposal_draft: ["proposal_waiting"],
  proposal_waiting: ["proposal_paid", "proposal_draft"],
  proposal_paid: ["proposal_waiting"],
};

export function normalizeCurrentStatusKey(raw: string): StatusKey | null {
  if (raw === LEGACY_APPROVED_KEY) {
    return "proposal_waiting";
  }
  if (STATUS_KEYS.includes(raw as StatusKey)) {
    return raw as StatusKey;
  }
  return null;
}

export function canTransitionStatus(current: StatusKey, next: StatusKey): boolean {
  if (current === next) return true;
  return ALLOWED_TRANSITIONS[current].includes(next);
}

export function mapStatusKeyToLegacyStatus(key: StatusKey): Prisma.CommercialOfferStatus {
  if (key === "proposal_draft") return Prisma.CommercialOfferStatus.DRAFT;
  if (key === "proposal_waiting") return Prisma.CommercialOfferStatus.SENT;
  return Prisma.CommercialOfferStatus.ACCEPTED;
}
