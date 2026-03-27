import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';

export interface CoatingsRepository {
  getItems(): Observable<CoatingItem[]>;
  create(input: CoatingItemInput): void;
  update(id: string, input: CoatingItemInput): void;
  remove(id: string): void;
}

export const COATINGS_REPOSITORY = new InjectionToken<CoatingsRepository>('COATINGS_REPOSITORY');
