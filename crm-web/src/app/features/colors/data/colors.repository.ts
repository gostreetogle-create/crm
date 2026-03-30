import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ColorItem, ColorItemInput } from '../model/color-item';

export type DictionaryPropagationMode = 'local' | 'global';
export type DictionaryPropagationOptions = { propagation?: DictionaryPropagationMode };

export interface ColorsRepository {
  getItems(): Observable<ColorItem[]>;
  create(input: ColorItemInput): Observable<ColorItem>;
  update(id: string, input: ColorItemInput, options?: DictionaryPropagationOptions): Observable<ColorItem>;
  remove(id: string, options?: DictionaryPropagationOptions): Observable<void>;
}

export const COLORS_REPOSITORY = new InjectionToken<ColorsRepository>('COLORS_REPOSITORY');
