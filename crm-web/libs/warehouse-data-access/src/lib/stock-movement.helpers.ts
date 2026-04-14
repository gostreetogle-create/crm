import type { ApiStockMovementType } from './warehouse.models';

export type StockMovementType = 'INCOMING' | 'OUTGOING' | 'ADJUSTMENT';

export function toStockMovementType(type: ApiStockMovementType): StockMovementType {
  if (type === 'incoming') return 'INCOMING';
  if (type === 'outgoing') return 'OUTGOING';
  return 'ADJUSTMENT';
}

export function fromStockMovementType(type: StockMovementType): ApiStockMovementType {
  if (type === 'INCOMING') return 'incoming';
  if (type === 'OUTGOING') return 'outgoing';
  return 'adjustment';
}

export function getMovementLabel(type: StockMovementType): string {
  if (type === 'INCOMING') return 'Приход';
  if (type === 'OUTGOING') return 'Расход';
  return 'Корректировка';
}

export function getMovementColor(type: StockMovementType): string {
  if (type === 'INCOMING') return 'movement--green';
  if (type === 'OUTGOING') return 'movement--red';
  return 'movement--orange';
}

export const MOVEMENT_TYPES: Array<{ value: StockMovementType; label: string }> = [
  { value: 'INCOMING', label: getMovementLabel('INCOMING') },
  { value: 'OUTGOING', label: getMovementLabel('OUTGOING') },
  { value: 'ADJUSTMENT', label: getMovementLabel('ADJUSTMENT') },
];
