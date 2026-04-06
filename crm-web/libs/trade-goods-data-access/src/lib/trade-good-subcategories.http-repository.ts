import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { Observable } from 'rxjs';
import type { TradeGoodSubcategoryInput, TradeGoodSubcategoryItem } from './trade-good-subcategory';
import { TradeGoodSubcategoriesRepository } from './trade-good-subcategories.repository';

@Injectable()
export class TradeGoodSubcategoriesHttpRepository implements TradeGoodSubcategoriesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/trade-good-subcategories${path}`;
  }

  getItems(categoryId?: string): Observable<TradeGoodSubcategoryItem[]> {
    let params = new HttpParams();
    if (categoryId?.trim()) {
      params = params.set('categoryId', categoryId.trim());
    }
    return this.http.get<TradeGoodSubcategoryItem[]>(this.endpoint(), { params });
  }

  create(input: TradeGoodSubcategoryInput): Observable<TradeGoodSubcategoryItem> {
    return this.http.post<TradeGoodSubcategoryItem>(this.endpoint(), input);
  }

  update(id: string, input: TradeGoodSubcategoryInput): Observable<TradeGoodSubcategoryItem> {
    return this.http.put<TradeGoodSubcategoryItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
