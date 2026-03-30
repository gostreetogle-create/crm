import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';

import { DictionaryPropagationOptions } from '../../colors/data/colors.repository';

export interface CoatingsRepository {
  getItems(): Observable<CoatingItem[]>;
  create(input: CoatingItemInput): Observable<CoatingItem>;
  update(id: string, input: CoatingItemInput, options?: DictionaryPropagationOptions): Observable<CoatingItem>;
  remove(id: string, options?: DictionaryPropagationOptions): Observable<void>;
}

export const COATINGS_REPOSITORY = new InjectionToken<CoatingsRepository>('COATINGS_REPOSITORY');
