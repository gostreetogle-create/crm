import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { CatalogArticleInput, CatalogArticleItem } from './catalog-suite.models';
import { CatalogArticlesRepository } from './catalog-articles.repository';

@Injectable()
export class CatalogArticlesHttpRepository implements CatalogArticlesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/catalog-articles${path}`;
  }

  getItems(productId?: string): Observable<CatalogArticleItem[]> {
    let params = new HttpParams();
    if (productId?.trim()) {
      params = params.set('productId', productId.trim());
    }
    return this.http.get<CatalogArticleItem[]>(this.endpoint(), { params });
  }

  getById(id: string): Observable<CatalogArticleItem> {
    return this.http.get<CatalogArticleItem>(this.endpoint(`/${id}`));
  }

  create(input: CatalogArticleInput): Observable<CatalogArticleItem> {
    return this.http.post<CatalogArticleItem>(this.endpoint(), input);
  }

  update(id: string, input: CatalogArticleInput): Observable<CatalogArticleItem> {
    return this.http.put<CatalogArticleItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
