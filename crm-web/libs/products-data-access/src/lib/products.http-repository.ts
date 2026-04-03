import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { ProductItem, ProductItemInput, ProductListItem } from './product-item';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsHttpRepository implements ProductsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/products${path}`;
  }

  getItems(): Observable<ProductListItem[]> {
    return this.http.get<ProductListItem[]>(this.endpoint());
  }

  getById(id: string): Observable<ProductItem> {
    return this.http.get<ProductItem>(this.endpoint(`/${id}`));
  }

  create(input: ProductItemInput): Observable<ProductItem> {
    return this.http.post<ProductItem>(this.endpoint(), input);
  }

  update(id: string, input: ProductItemInput): Observable<ProductItem> {
    return this.http.put<ProductItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
