import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';

export interface CoatingsRepository {
  getItems(): Observable<CoatingItem[]>;
  create(input: CoatingItemInput): Observable<CoatingItem>;
  update(id: string, input: CoatingItemInput): Observable<CoatingItem>;
  remove(id: string): Observable<void>;
}

export const COATINGS_REPOSITORY = new InjectionToken<CoatingsRepository>('COATINGS_REPOSITORY');
