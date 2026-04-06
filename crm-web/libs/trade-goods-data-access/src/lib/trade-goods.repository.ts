import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { TradeGoodItem, TradeGoodItemInput, TradeGoodListItem } from './trade-good-item';

export const TRADE_GOODS_REPOSITORY = new InjectionToken<TradeGoodsRepository>('TRADE_GOODS_REPOSITORY');

export interface TradeGoodsRepository {
  getItems(): Observable<TradeGoodListItem[]>;
  getById(id: string): Observable<TradeGoodItem>;
  create(input: TradeGoodItemInput): Observable<TradeGoodItem>;
  update(id: string, input: TradeGoodItemInput): Observable<TradeGoodItem>;
  /** POST multipart: `files` + `primaryIndex` (1-based). */
  uploadPhotos(id: string, files: File[], primaryIndex: number): Observable<TradeGoodItem>;
  remove(id: string): Observable<void>;
}
