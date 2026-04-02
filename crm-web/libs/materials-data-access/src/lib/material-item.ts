/**
 * Учётная позиция материала (склад/закупка): цена и единица здесь; профиль вещества — в «Характеристиках материала»;
 * форма и размеры — в «Геометриях».
 */
export type MaterialItem = {
  id: string;
  /** Краткое имя позиции (SKU / как в накладной). */
  name: string;
  /** Внутренний код складской позиции. */
  code?: string;
  /** Ссылка на справочник единиц; цена — за одну эту единицу. */
  unitId?: string;
  /** Подпись для таблицы/Excel без join. */
  unitName?: string;
  /** Закупочная цена, ₽ за `unitId`. */
  purchasePriceRub?: number;
  /** Поставщик (организация), опционально. */
  supplierOrganizationId?: string;
  /** Подпись поставщика для таблицы. */
  supplierOrganizationLabel?: string;
  /** Код единицы измерения (из API). */
  unitCode?: string;
  /** Профиль (плотность, цвет, финиш, покрытие) — в справочнике характеристик. */
  materialCharacteristicId: string;
  /** Форма и габариты — отдельный справочник. */
  geometryId: string;
  /** Денорм для отображения без join (опционально). */
  geometryName?: string;
  notes?: string;
  isActive: boolean;
};

export type MaterialItemInput = Omit<MaterialItem, 'id'>;
