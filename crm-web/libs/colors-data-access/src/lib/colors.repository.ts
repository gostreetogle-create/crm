import { InjectionToken } from '@angular/core';
import type { DictionaryPropagationOptions } from '@srm/shared-types';
import { Observable } from 'rxjs';
import type { ColorItem, ColorItemInput } from './color-item';

export interface ColorsRepository {
  getItems(): Observable<ColorItem[]>;
  create(input: ColorItemInput): Observable<ColorItem>;
  update(id: string, input: ColorItemInput, options?: DictionaryPropagationOptions): Observable<ColorItem>;
  remove(id: string, options?: DictionaryPropagationOptions): Observable<void>;
}

export const COLORS_REPOSITORY = new InjectionToken<ColorsRepository>('COLORS_REPOSITORY');
