export type ProductionWorkTypeItem = {
  /** Стабильный идентификатор для API/БД и FK из маршрута/заказа; на экране не показываем как отдельное поле. */
  id: string;
  /** Домен: Наименование (уникально среди активных записей в UX; на бэке — по правилам unique index). */
  name: string;
  /** Домен: Короткое_обозначение. */
  shortLabel: string;
  /**
   * Учётная ставка труда по этому виду работ, руб/ч (без копеек в UI первой версии).
   * Себестоимость труда по операции: часы × ставка; часы задаются в маршруте/заказе, не здесь.
   */
  hourlyRateRub: number;
  isActive: boolean;
};

export type ProductionWorkTypeItemInput = Omit<ProductionWorkTypeItem, 'id'>;
