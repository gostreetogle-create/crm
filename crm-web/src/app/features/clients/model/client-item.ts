/**
 * Контрагент для КП и ценообразования.
 * Наценка клиента (`clientMarkupPercent`) — целевой контур из архивной модели `Client.clientMarkup`.
 */
export type ClientItem = {
  id: string;
  name: string;
  /** Условный код / краткий идентификатор в документах */
  code: string;
  /** Наценка к базовой цене, % (0–1000; пусто = не задано) */
  clientMarkupPercent: number | null;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
};

export type ClientItemInput = Omit<ClientItem, 'id'>;
