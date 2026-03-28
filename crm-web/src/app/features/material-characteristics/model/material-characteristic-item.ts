/**
 * Профиль материала (марка/тип): плотность и ссылки на цвет, финиш, покрытие.
 * Учётная цена и единица измерения — у сущности «Материал», не здесь.
 */
export type MaterialCharacteristicItem = {
  id: string;
  name: string;
  code?: string;
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

export type MaterialCharacteristicItemInput = Omit<MaterialCharacteristicItem, 'id'>;
