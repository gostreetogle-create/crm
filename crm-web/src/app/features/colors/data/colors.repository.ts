import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ColorItem, ColorItemInput } from '../model/color-item';

export interface ColorsRepository {
  getItems(): Observable<ColorItem[]>;
  create(input: ColorItemInput): Observable<ColorItem>;
  update(id: string, input: ColorItemInput): Observable<ColorItem>;
  remove(id: string): Observable<void>;
}

export const COLORS_REPOSITORY = new InjectionToken<ColorsRepository>('COLORS_REPOSITORY');
