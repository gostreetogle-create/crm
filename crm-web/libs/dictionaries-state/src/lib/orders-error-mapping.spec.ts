import { mapOrderDeleteError, mapOrderUpdateError } from './orders-error-mapping';

describe('orders-error-mapping', () => {
  it('maps update not_found to user-friendly message', () => {
    const err = { error: { error: 'not_found' } };
    expect(mapOrderUpdateError(err)).toBe('Заказ не найден. Обновите список и попробуйте снова.');
  });

  it('maps update invalid_body to validation hint', () => {
    const err = { error: { error: 'invalid_body' } };
    expect(mapOrderUpdateError(err)).toBe('Проверьте корректность полей заказа перед сохранением.');
  });

  it('maps delete not_found to user-friendly message', () => {
    const err = { error: { error: 'not_found' } };
    expect(mapOrderDeleteError(err)).toBe('Заказ уже удален или не найден.');
  });

  it('uses backend message when provided', () => {
    const err = { error: { message: 'Кастомная ошибка' } };
    expect(mapOrderUpdateError(err)).toBe('Кастомная ошибка');
  });
});
