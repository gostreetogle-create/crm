/**
 * Профиль материала (марка/тип): плотность и ссылки на цвет, финиш, покрытие.
 * Учётная цена и единица измерения — у сущности «Материал», не здесь.
 *
 * Контракт для API: при сохранении из UI/импорта задаём `colorId` / `surfaceFinishId` / `coatingId`
 * и денормализованные поля (`colorName`, `colorHex`, …) как снимок с выбранных справочников.
 * Не храним «осиротевший» текст без id — импорт сопоставляет или создаёт записи в малых справочниках.
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
