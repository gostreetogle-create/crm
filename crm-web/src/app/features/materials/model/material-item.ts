export type MaterialItem = {
  id: string;
  name: string;
  code?: string;
  densityKgM3?: number;
  colorName?: string;
  colorHex?: string;
  notes?: string;
  isActive: boolean;
};

export type MaterialItemInput = Omit<MaterialItem, 'id'>;

