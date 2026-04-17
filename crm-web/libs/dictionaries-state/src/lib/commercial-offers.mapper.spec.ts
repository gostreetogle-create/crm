import { mapOfferDtoToPayload, mapOfferStatus, parseOfferNotes, stringifyOfferNotes } from './commercial-offers.mapper';

describe('commercial-offers.mapper', () => {
  describe('mapOfferDtoToPayload', () => {
    it('normalizes nullable strings and default numbers', () => {
      const payload = mapOfferDtoToPayload({
        id: 'offer-1',
        title: '  ',
        organizationId: '   ',
        clientId: null,
        organizationContactId: undefined,
        recipient: '',
        validUntil: null,
        currency: '',
        vatPercent: null,
        vatAmount: undefined,
        prepaymentPercent: null,
        productionLeadDays: undefined,
        notes: '   ',
        lines: [
          {
            name: '  Позиция  ',
            description: ' ',
            qty: null,
            unit: '',
            unitPrice: undefined,
            imageUrl: '',
            catalogProductId: '  ',
          },
        ],
      });

      expect(payload.currentStatusKey).toBe('proposal_draft');
      expect(payload.title).toBeNull();
      expect(payload.organizationId).toBeNull();
      expect(payload.clientId).toBeNull();
      expect(payload.organizationContactId).toBeNull();
      expect(payload.recipient).toBeNull();
      expect(payload.validUntil).toBeNull();
      expect(payload.currency).toBe('RUB');
      expect(payload.vatPercent).toBe(22);
      expect(payload.vatAmount).toBe(0);
      expect(payload.prepaymentPercent).toBe(80);
      expect(payload.productionLeadDays).toBe(30);
      expect(payload.notes).toBeNull();
      expect(payload.lines).toEqual([
        {
          lineNo: 1,
          name: 'Позиция',
          description: null,
          qty: 0,
          unit: 'шт.',
          unitPrice: 0,
          imageUrl: null,
          catalogProductId: null,
          sortOrder: 0,
        },
      ]);
    });

    it('adds copy suffix and skips catalog sync only when requested', () => {
      const source = {
        id: 'offer-2',
        title: 'КП на фурнитуру',
        organizationId: 'org-1',
        lines: [],
      };

      const copyPayload = mapOfferDtoToPayload(source, { copyTitle: true, skipCatalogSync: true });
      const regularPayload = mapOfferDtoToPayload(source);

      expect(copyPayload.title).toBe('КП на фурнитуру (копия)');
      expect(copyPayload.skipCatalogSync).toBe(true);
      expect(regularPayload.title).toBe('КП на фурнитуру');
      expect(regularPayload.skipCatalogSync).toBe(false);
    });
  });

  describe('mapOfferStatus', () => {
    it('maps legacy status aliases through common rules', () => {
      expect(mapOfferStatus('proposal_approved')).toBe('proposal_waiting');
      expect(mapOfferStatus('unexpected')).toBe('proposal_draft');
    });
  });

  describe('offer notes helpers', () => {
    it('keeps legacy plain string notes', () => {
      expect(parseOfferNotes('Обычная заметка')).toEqual({
        extraTexts: [],
        legacyNoteText: 'Обычная заметка',
        validityDays: 10,
        extraTextsTopPx: 800,
      });
    });

    it('parses json notes payload with extra texts', () => {
      expect(
        parseOfferNotes(
          '{"extraTexts":["  Первый  ","","Второй"],"legacyNoteText":" Примечание ","validityDays":14,"extraTextsTopPx":930}',
        ),
      ).toEqual({
        extraTexts: ['Первый', 'Второй'],
        legacyNoteText: 'Примечание',
        validityDays: 14,
        extraTextsTopPx: 930,
      });
    });

    it('serializes notes only when content exists', () => {
      expect(stringifyOfferNotes({ extraTexts: [], legacyNoteText: null, validityDays: 10, extraTextsTopPx: 800 })).toBeNull();
      expect(
        stringifyOfferNotes({ extraTexts: ['  A  ', ''], legacyNoteText: '  legacy ', validityDays: 18, extraTextsTopPx: 920 }),
      ).toBe(
        '{"extraTexts":["A"],"legacyNoteText":"legacy","validityDays":18,"extraTextsTopPx":920}',
      );
    });
  });
});
