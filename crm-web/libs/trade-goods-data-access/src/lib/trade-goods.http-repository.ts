import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { TradeGoodItem, TradeGoodItemInput, TradeGoodListItem, TradeGoodsPage } from './trade-good-item';
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
    return this.getItemsPage(1, 1000).pipe(map((page) => page.data));
  }

  getItemsPage(page: number, pageSize: number): Observable<TradeGoodsPage> {
    return this.http.get<TradeGoodsPage>(this.endpoint(`?page=${page}&pageSize=${pageSize}`));
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

  uploadPhotos(id: string, files: File[], primaryIndex: number): Observable<TradeGoodItem> {
    const fd = new FormData();
    for (const f of files) {
      fd.append('files', f, f.name);
    }
    fd.append('primaryIndex', String(primaryIndex));
    return this.http.post<TradeGoodItem>(this.endpoint(`/${id}/photos`), fd);
  }

  remove(id: string, options?: { deleteRelated?: boolean }): Observable<void> {
    const q = options?.deleteRelated ? '?deleteRelated=1' : '';
    return this.http.delete<void>(this.endpoint(`/${id}${q}`));
  }
}
