import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { CatalogProductInput, CatalogProductItem } from './catalog-suite.models';
import { CatalogProductsRepository } from './catalog-products.repository';

@Injectable()
export class CatalogProductsHttpRepository implements CatalogProductsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/catalog-products${path}`;
  }

  getItems(complexId?: string): Observable<CatalogProductItem[]> {
    let params = new HttpParams();
    if (complexId?.trim()) {
      params = params.set('complexId', complexId.trim());
    }
    return this.http.get<CatalogProductItem[]>(this.endpoint(), { params });
  }

  getById(id: string): Observable<CatalogProductItem> {
    return this.http.get<CatalogProductItem>(this.endpoint(`/${id}`));
  }

  create(input: CatalogProductInput): Observable<CatalogProductItem> {
    return this.http.post<CatalogProductItem>(this.endpoint(), input);
  }

  update(id: string, input: CatalogProductInput): Observable<CatalogProductItem> {
    return this.http.put<CatalogProductItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
