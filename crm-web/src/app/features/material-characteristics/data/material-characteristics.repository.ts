import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MaterialCharacteristicItem, MaterialCharacteristicItemInput } from '../model/material-characteristic-item';

export type MaterialCharacteristicsRepository = {
  getItems(): Observable<MaterialCharacteristicItem[]>;
  create(input: MaterialCharacteristicItemInput): void;
  update(id: string, input: MaterialCharacteristicItemInput): void;
  remove(id: string): void;
};

export const MATERIAL_CHARACTERISTICS_REPOSITORY = new InjectionToken<MaterialCharacteristicsRepository>(
  'MATERIAL_CHARACTERISTICS_REPOSITORY'
);
