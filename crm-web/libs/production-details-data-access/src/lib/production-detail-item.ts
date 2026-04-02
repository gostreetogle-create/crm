/** Позиция справочника «Детали» (независимый снимок материала + работ). */
export type ProductionDetailItem = {
  id: string;
  name: string;
  code?: string | null;
  qty: number;
  notes?: string | null;
  isActive: boolean;
  sourceMaterialId?: string | null;
  sourceWorkTypeId?: string | null;
  snapshotMaterialName?: string | null;
  snapshotMaterialCode?: string | null;
  snapshotUnitCode?: string | null;
  snapshotUnitName?: string | null;
  snapshotPurchasePriceRub?: number | null;
  snapshotDensityKgM3?: number | null;
  snapshotHeightMm?: number | null;
  snapshotLengthMm?: number | null;
  snapshotWidthMm?: number | null;
  snapshotDiameterMm?: number | null;
  snapshotThicknessMm?: number | null;
  snapshotCharacteristicName?: string | null;
  snapshotWorkTypeName?: string | null;
  snapshotWorkShortLabel?: string | null;
  snapshotHourlyRateRub?: number | null;
  workTimeHours?: number | null;
  materialTotalRub?: number | null;
  workTotalRub?: number | null;
  lineTotalRub?: number | null;
};

export type ProductionDetailItemInput = Omit<ProductionDetailItem, 'id'>;
