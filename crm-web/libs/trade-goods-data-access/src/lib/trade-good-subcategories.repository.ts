import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { TradeGoodSubcategoryInput, TradeGoodSubcategoryItem } from './trade-good-subcategory';

export const TRADE_GOOD_SUBCATEGORIES_REPOSITORY = new InjectionToken<TradeGoodSubcategoriesRepository>(
  'TRADE_GOOD_SUBCATEGORIES_REPOSITORY',
);

export interface TradeGoodSubcategoriesRepository {
  getItems(categoryId?: string): Observable<TradeGoodSubcategoryItem[]>;
  create(input: TradeGoodSubcategoryInput): Observable<TradeGoodSubcategoryItem>;
  update(id: string, input: TradeGoodSubcategoryInput): Observable<TradeGoodSubcategoryItem>;
  remove(id: string): Observable<void>;
}
