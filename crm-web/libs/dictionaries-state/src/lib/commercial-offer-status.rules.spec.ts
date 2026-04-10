import {
  canTransition,
  canCommercialOfferTransition,
  commercialOfferStatusSelectOptions,
  isDraft,
  labelByStatusKey,
  normalizeStatusKey,
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
      ['proposal_paid', 'proposal_waiting'],
    ] as const)('allows transition %s -> %s', (from, to) => {
      expect(canCommercialOfferTransition(from, to)).toBe(true);
    });

    it.each([
      ['proposal_draft', 'proposal_paid'],
      ['proposal_paid', 'proposal_draft'],
      ['proposal_waiting', 'unexpected'],
    ] as const)('rejects transition %s -> %s', (from, to) => {
      expect(canCommercialOfferTransition(from, to)).toBe(false);
    });
  });

  describe('compat wrappers', () => {
    it('delegates normalizeStatusKey to normalizeCommercialOfferStatusKey', () => {
      expect(normalizeStatusKey('proposal_approved')).toBe('proposal_waiting');
    });

    it('delegates canTransition to canCommercialOfferTransition', () => {
      expect(canTransition('proposal_waiting', 'proposal_paid')).toBe(true);
      expect(canTransition('proposal_paid', 'proposal_waiting')).toBe(true);
      expect(canTransition('proposal_paid', 'proposal_draft')).toBe(false);
    });
  });

  describe('isDraft', () => {
    it('detects draft from scalar keys', () => {
      expect(isDraft('proposal_draft')).toBe(true);
      expect(isDraft('proposal_approved')).toBe(false);
    });

    it('detects draft from status-like object fields', () => {
      expect(isDraft({ currentStatusKey: 'proposal_draft' })).toBe(true);
      expect(isDraft({ statusKey: 'proposal_draft' })).toBe(true);
      expect(isDraft({ status: 'DRAFT' })).toBe(true);
      expect(isDraft({ currentStatusKey: 'proposal_paid', status: 'ACCEPTED' })).toBe(false);
      expect(isDraft({ currentStatusKey: 'proposal_waiting', status: 'SENT' })).toBe(false);
      expect(isDraft({ status: 'proposal_paid' })).toBe(false);
    });
  });

  describe('labelByStatusKey', () => {
    it('returns russian labels for canonical and legacy keys', () => {
      expect(labelByStatusKey('proposal_draft')).toBe('Черновик');
      expect(labelByStatusKey('proposal_waiting')).toBe('На согласовании');
      expect(labelByStatusKey('proposal_approved')).toBe('На согласовании');
      expect(labelByStatusKey('proposal_paid')).toBe('Оплачено');
    });
  });

  describe('commercialOfferStatusSelectOptions', () => {
    it('marks only allowed transitions for draft', () => {
      const opts = commercialOfferStatusSelectOptions('proposal_draft');
      expect(opts.map((o) => o.key)).toEqual(['proposal_draft', 'proposal_waiting', 'proposal_paid']);
      const byKey = Object.fromEntries(opts.map((o) => [o.key, o.disabled]));
      expect(byKey['proposal_draft']).toBe(false);
      expect(byKey['proposal_waiting']).toBe(false);
      expect(byKey['proposal_paid']).toBe(true);
    });

    it('from paid allows rollback to waiting; draft stays disabled', () => {
      const opts = commercialOfferStatusSelectOptions('proposal_paid');
      expect(opts.find((o) => o.key === 'proposal_paid')?.disabled).toBe(false);
      expect(opts.find((o) => o.key === 'proposal_waiting')?.disabled).toBe(false);
      expect(opts.find((o) => o.key === 'proposal_draft')?.disabled).toBe(true);
    });
  });
});
