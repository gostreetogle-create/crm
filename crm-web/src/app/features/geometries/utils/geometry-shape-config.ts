/**
 * Единые правила по типу геометрии: какие поля мм показывать и какие обязательны.
 * Прямоугольный профиль / брус / прямоугольная труба — один тип `rectangular` (опционально толщина стенки).
 */
export type GeometryDimKey = 'heightMm' | 'lengthMm' | 'widthMm' | 'diameterMm' | 'thicknessMm';

/** Знак диаметра (⌀) в подписи поля — как на чертежах */
export const GEOMETRY_DIAMETER_LABEL = '\u2300 Диаметр (мм)';

export function isGeometryDimensionVisible(shapeKey: string, field: GeometryDimKey): boolean {
  switch (shapeKey) {
    case 'rectangular':
      return field !== 'diameterMm';
    case 'tube':
      return field === 'diameterMm' || field === 'thicknessMm' || field === 'lengthMm';
    case 'cylindrical':
      return field === 'diameterMm' || field === 'lengthMm';
    case 'plate':
      return field === 'lengthMm' || field === 'widthMm' || field === 'thicknessMm';
    case 'custom':
      return true;
    default:
      return true;
  }
}

export function isGeometryDimensionRequired(shapeKey: string, field: GeometryDimKey): boolean {
  switch (shapeKey) {
    case 'rectangular':
      return field === 'heightMm' || field === 'widthMm' || field === 'lengthMm';
    case 'tube':
      return field === 'diameterMm' || field === 'thicknessMm' || field === 'lengthMm';
    case 'cylindrical':
      return field === 'diameterMm' || field === 'lengthMm';
    case 'plate':
      return field === 'lengthMm' || field === 'widthMm' || field === 'thicknessMm';
    case 'custom':
    default:
      return false;
  }
}
