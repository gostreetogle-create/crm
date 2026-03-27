import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductionWorkTypeItem, ProductionWorkTypeItemInput } from '../model/production-work-type-item';

export interface ProductionWorkTypesRepository {
  getItems(): Observable<ProductionWorkTypeItem[]>;
  create(input: ProductionWorkTypeItemInput): void;
  update(id: string, input: ProductionWorkTypeItemInput): void;
  remove(id: string): void;
}

export const PRODUCTION_WORK_TYPES_REPOSITORY = new InjectionToken<ProductionWorkTypesRepository>(
  'PRODUCTION_WORK_TYPES_REPOSITORY'
);
