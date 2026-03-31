/**
 * Контактное лицо (данные физлица) для привязки к карточке организации и для КП.
 * Наценка (`clientMarkupPercent`) — целевой контур из архивной модели `Client.clientMarkup`.
 */
export type ClientItem = {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
  /** Наценка к базовой цене, % (0–1000; пусто = не задано) */
  clientMarkupPercent: number | null;
  isActive: boolean;
  /** Необязательно; актуально для контакта без привязки к организации */
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
};

export type ClientItemInput = Omit<ClientItem, 'id'>;

export function formatClientFio(
  item: Pick<ClientItem, 'lastName' | 'firstName' | 'patronymic'>
): string {
  return [item.lastName, item.firstName, item.patronymic]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ');
}
