export type MaterialItem = {
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

export type MaterialItemInput = Omit<MaterialItem, 'id'>;

