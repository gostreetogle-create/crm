import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { ProductionDetailItem, ProductionDetailItemInput } from './production-detail-item';

export interface ProductionDetailsRepository {
  getItems(): Observable<ProductionDetailItem[]>;
  create(input: ProductionDetailItemInput): Observable<ProductionDetailItem>;
  update(id: string, input: ProductionDetailItemInput): Observable<ProductionDetailItem>;
  remove(id: string): Observable<void>;
}

export const PRODUCTION_DETAILS_REPOSITORY = new InjectionToken<ProductionDetailsRepository>(
  'PRODUCTION_DETAILS_REPOSITORY',
);
