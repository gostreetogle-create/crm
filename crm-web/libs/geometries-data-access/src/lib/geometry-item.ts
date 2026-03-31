export type GeometryItem = {
  id: string;
  name: string;
  shapeKey: string;
  heightMm?: number;
  lengthMm?: number;
  widthMm?: number;
  diameterMm?: number;
  thicknessMm?: number;
  notes?: string;
  isActive: boolean;
};

export type GeometryItemInput = Omit<GeometryItem, 'id'>;

