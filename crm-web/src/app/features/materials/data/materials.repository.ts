import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MaterialItem, MaterialItemInput } from '../model/material-item';

export interface MaterialsRepository {
  getItems(): Observable<MaterialItem[]>;
  create(input: MaterialItemInput): void;
  update(id: string, input: MaterialItemInput): void;
  remove(id: string): void;
}

export const MATERIALS_REPOSITORY = new InjectionToken<MaterialsRepository>(
  'MATERIALS_REPOSITORY'
);

