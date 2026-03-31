import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MaterialCharacteristicItem, MaterialCharacteristicItemInput } from './material-characteristic-item';

export type MaterialCharacteristicsRepository = {
  getItems(): Observable<MaterialCharacteristicItem[]>;
  create(input: MaterialCharacteristicItemInput): Observable<MaterialCharacteristicItem>;
  update(id: string, input: MaterialCharacteristicItemInput): Observable<MaterialCharacteristicItem>;
  remove(id: string): Observable<void>;
};

export const MATERIAL_CHARACTERISTICS_REPOSITORY = new InjectionToken<MaterialCharacteristicsRepository>(
  'MATERIAL_CHARACTERISTICS_REPOSITORY'
);
