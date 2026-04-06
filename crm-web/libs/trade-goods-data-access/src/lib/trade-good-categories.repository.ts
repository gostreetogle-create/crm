import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { TradeGoodCategoryInput, TradeGoodCategoryItem } from './trade-good-category';

export const TRADE_GOOD_CATEGORIES_REPOSITORY = new InjectionToken<TradeGoodCategoriesRepository>(
  'TRADE_GOOD_CATEGORIES_REPOSITORY',
);

export interface TradeGoodCategoriesRepository {
  getItems(): Observable<TradeGoodCategoryItem[]>;
  create(input: TradeGoodCategoryInput): Observable<TradeGoodCategoryItem>;
  update(id: string, input: TradeGoodCategoryInput): Observable<TradeGoodCategoryItem>;
  remove(id: string): Observable<void>;
}
