import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CoatingItem, CoatingItemInput } from './coating-item';

import type { DictionaryPropagationOptions } from '@srm/shared-types';

export interface CoatingsRepository {
  getItems(): Observable<CoatingItem[]>;
  create(input: CoatingItemInput): Observable<CoatingItem>;
  update(id: string, input: CoatingItemInput, options?: DictionaryPropagationOptions): Observable<CoatingItem>;
  remove(id: string, options?: DictionaryPropagationOptions): Observable<void>;
}

export const COATINGS_REPOSITORY = new InjectionToken<CoatingsRepository>('COATINGS_REPOSITORY');
