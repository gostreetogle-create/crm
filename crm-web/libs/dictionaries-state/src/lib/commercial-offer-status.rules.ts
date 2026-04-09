export type ProposalStatusKey = 'proposal_draft' | 'proposal_waiting' | 'proposal_paid';

export const COMMERCIAL_OFFER_ALLOWED_TRANSITIONS: Readonly<Record<ProposalStatusKey, readonly ProposalStatusKey[]>> = {
  proposal_draft: ['proposal_waiting'],
  proposal_waiting: ['proposal_draft', 'proposal_paid'],
  proposal_paid: [],
};

export function normalizeCommercialOfferStatusKey(raw: unknown): ProposalStatusKey {
  const key = String(raw ?? '').trim();
  if (key === 'proposal_waiting' || key === 'proposal_approved') {
    return 'proposal_waiting';
  }
  if (key === 'proposal_paid') {
    return 'proposal_paid';
  }
  return 'proposal_draft';
}

export function canCommercialOfferTransition(
  currentRaw: unknown,
  nextRaw: unknown,
): boolean {
  const current = normalizeCommercialOfferStatusKey(currentRaw);
  const next = String(nextRaw ?? '').trim() as ProposalStatusKey;
  if (next !== 'proposal_draft' && next !== 'proposal_waiting' && next !== 'proposal_paid') {
    return false;
  }
  if (current === next) {
    return true;
  }
  return COMMERCIAL_OFFER_ALLOWED_TRANSITIONS[current].includes(next);
}
