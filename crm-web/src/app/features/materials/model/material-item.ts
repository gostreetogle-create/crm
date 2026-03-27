export type MaterialItem = {
  id: string;
  name: string;
  code?: string;
  /** Ссылка на справочник единиц; цена ниже — за одну эту единицу (кг, шт, …). */
  unitId?: string;
  /** Подпись для таблицы/Excel без join (напр. «кг (kg)»). */
  unitName?: string;
  /** Учётная/закупочная цена, ₽ за `unitId`. */
  purchasePriceRub?: number;
  densityKgM3?: number;
  colorId?: string;
  colorName?: string;
  colorHex?: string;
  surfaceFinishId?: string;
  finishType?: string;
  roughnessClass?: string;
  raMicron?: number;
  coatingId?: string;
  coatingType?: string;
  coatingSpec?: string;
  coatingThicknessMicron?: number;
  notes?: string;
  isActive: boolean;
};

export type MaterialItemInput = Omit<MaterialItem, 'id'>;

