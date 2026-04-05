import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { TradeGoodItem, TradeGoodItemInput, TradeGoodListItem } from './trade-good-item';
import { TradeGoodsRepository } from './trade-goods.repository';

@Injectable()
export class TradeGoodsHttpRepository implements TradeGoodsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/trade-goods${path}`;
  }

  getItems(): Observable<TradeGoodListItem[]> {
    return this.http.get<TradeGoodListItem[]>(this.endpoint());
  }

  getById(id: string): Observable<TradeGoodItem> {
    return this.http.get<TradeGoodItem>(this.endpoint(`/${id}`));
  }

  create(input: TradeGoodItemInput): Observable<TradeGoodItem> {
    return this.http.post<TradeGoodItem>(this.endpoint(), input);
  }

  update(id: string, input: TradeGoodItemInput): Observable<TradeGoodItem> {
    return this.http.put<TradeGoodItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
