import {
  canCommercialOfferTransition,
  normalizeCommercialOfferStatusKey,
} from './commercial-offer-status.rules';

describe('commercial-offer-status.rules', () => {
  describe('normalizeCommercialOfferStatusKey', () => {
    it('maps legacy proposal_approved to proposal_waiting', () => {
      expect(normalizeCommercialOfferStatusKey('proposal_approved')).toBe('proposal_waiting');
    });

    it('keeps canonical values', () => {
      expect(normalizeCommercialOfferStatusKey('proposal_draft')).toBe('proposal_draft');
      expect(normalizeCommercialOfferStatusKey('proposal_waiting')).toBe('proposal_waiting');
      expect(normalizeCommercialOfferStatusKey('proposal_paid')).toBe('proposal_paid');
    });

    it('falls back to proposal_draft for unknown values', () => {
      expect(normalizeCommercialOfferStatusKey('unexpected')).toBe('proposal_draft');
      expect(normalizeCommercialOfferStatusKey(null)).toBe('proposal_draft');
    });
  });

  describe('canCommercialOfferTransition', () => {
    it.each([
      ['proposal_draft', 'proposal_waiting'],
      ['proposal_waiting', 'proposal_draft'],
      ['proposal_waiting', 'proposal_paid'],
      ['proposal_approved', 'proposal_paid'],
      ['proposal_draft', 'proposal_draft'],
    ] as const)('allows transition %s -> %s', (from, to) => {
      expect(canCommercialOfferTransition(from, to)).toBe(true);
    });

    it.each([
      ['proposal_draft', 'proposal_paid'],
      ['proposal_paid', 'proposal_waiting'],
      ['proposal_paid', 'proposal_draft'],
      ['proposal_waiting', 'unexpected'],
    ] as const)('rejects transition %s -> %s', (from, to) => {
      expect(canCommercialOfferTransition(from, to)).toBe(false);
    });
  });
});
