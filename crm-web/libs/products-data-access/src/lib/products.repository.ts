import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { ProductItem, ProductItemInput, ProductListItem } from './product-item';

export const PRODUCTS_REPOSITORY = new InjectionToken<ProductsRepository>('PRODUCTS_REPOSITORY');

export interface ProductsRepository {
  getItems(): Observable<ProductListItem[]>;
  getById(id: string): Observable<ProductItem>;
  create(input: ProductItemInput): Observable<ProductItem>;
  update(id: string, input: ProductItemInput): Observable<ProductItem>;
  remove(id: string): Observable<void>;
}
