import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { Observable } from 'rxjs';
import type { TradeGoodCategoryInput, TradeGoodCategoryItem } from './trade-good-category';
import { TradeGoodCategoriesRepository } from './trade-good-categories.repository';

@Injectable()
export class TradeGoodCategoriesHttpRepository implements TradeGoodCategoriesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/trade-good-categories${path}`;
  }

  getItems(): Observable<TradeGoodCategoryItem[]> {
    return this.http.get<TradeGoodCategoryItem[]>(this.endpoint());
  }

  create(input: TradeGoodCategoryInput): Observable<TradeGoodCategoryItem> {
    return this.http.post<TradeGoodCategoryItem>(this.endpoint(), input);
  }

  update(id: string, input: TradeGoodCategoryInput): Observable<TradeGoodCategoryItem> {
    return this.http.put<TradeGoodCategoryItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
