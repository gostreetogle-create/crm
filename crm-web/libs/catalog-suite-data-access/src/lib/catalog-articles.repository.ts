import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { CatalogArticleInput, CatalogArticleItem } from './catalog-suite.models';

export const CATALOG_ARTICLES_REPOSITORY = new InjectionToken<CatalogArticlesRepository>(
  'CATALOG_ARTICLES_REPOSITORY',
);

export interface CatalogArticlesRepository {
  /** @param productId — фильтр `?productId=`; без него — все позиции. */
  getItems(productId?: string): Observable<CatalogArticleItem[]>;
  getById(id: string): Observable<CatalogArticleItem>;
  create(input: CatalogArticleInput): Observable<CatalogArticleItem>;
  update(id: string, input: CatalogArticleInput): Observable<CatalogArticleItem>;
  remove(id: string): Observable<void>;
}
