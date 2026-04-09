import {
  mapCommercialOfferDeleteError,
  mapCommercialOfferStatusError,
} from './commercial-offers-error-mapping';

describe('commercial-offers-error-mapping', () => {
  describe('mapCommercialOfferStatusError', () => {
    it('maps illegal_status_transition', () => {
      const err = { error: { error: 'illegal_status_transition' } };
      expect(mapCommercialOfferStatusError(err)).toBe('Недопустимый переход статуса для этого КП.');
    });

    it('maps invalid_current_status', () => {
      const err = { error: { error: 'invalid_current_status' } };
      expect(mapCommercialOfferStatusError(err)).toBe(
        'Текущий статус КП не распознан. Обновите список и попробуйте снова.',
      );
    });
  });

  describe('mapCommercialOfferDeleteError', () => {
    it('maps offer_has_order with order number', () => {
      const err = {
        error: {
          error: 'offer_has_order',
          order: { number: 'ORD-77' },
        },
      };
      expect(mapCommercialOfferDeleteError(err)).toBe('КП связано с заказом № ORD-77. Сначала удалите заказ, затем КП.');
    });

    it('maps paid_offer_locked', () => {
      const err = { error: { error: 'paid_offer_locked' } };
      expect(mapCommercialOfferDeleteError(err)).toBe(
        'Оплаченное КП нельзя удалить напрямую. Если для него создан заказ — сначала удалите заказ.',
      );
    });

    it('uses backend message fallback', () => {
      const err = { error: { message: 'Кастомная ошибка' } };
      expect(mapCommercialOfferDeleteError(err)).toBe('Кастомная ошибка');
    });
  });
});
