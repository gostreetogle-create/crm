import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { MaterialItem, MaterialItemInput } from './material-item';

export interface MaterialsRepository {
  getItems(): Observable<MaterialItem[]>;
  create(input: MaterialItemInput): Observable<MaterialItem>;
  update(id: string, input: MaterialItemInput): Observable<MaterialItem>;
  remove(id: string): Observable<void>;
}

export const MATERIALS_REPOSITORY = new InjectionToken<MaterialsRepository>('MATERIALS_REPOSITORY');
