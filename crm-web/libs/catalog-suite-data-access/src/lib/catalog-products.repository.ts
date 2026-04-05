import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { CatalogProductInput, CatalogProductItem } from './catalog-suite.models';

export const CATALOG_PRODUCTS_REPOSITORY = new InjectionToken<CatalogProductsRepository>(
  'CATALOG_PRODUCTS_REPOSITORY',
);

export interface CatalogProductsRepository {
  /** @param complexId — фильтр `?complexId=`; без него — все товары. */
  getItems(complexId?: string): Observable<CatalogProductItem[]>;
  getById(id: string): Observable<CatalogProductItem>;
  create(input: CatalogProductInput): Observable<CatalogProductItem>;
  update(id: string, input: CatalogProductInput): Observable<CatalogProductItem>;
  remove(id: string): Observable<void>;
}
