import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SurfaceFinishItem, SurfaceFinishItemInput } from './surface-finish-item';

import type { DictionaryPropagationOptions } from '@srm/shared-types';

export interface SurfaceFinishesRepository {
  getItems(): Observable<SurfaceFinishItem[]>;
  create(input: SurfaceFinishItemInput): Observable<SurfaceFinishItem>;
  update(id: string, input: SurfaceFinishItemInput, options?: DictionaryPropagationOptions): Observable<SurfaceFinishItem>;
  remove(id: string, options?: DictionaryPropagationOptions): Observable<void>;
}

export const SURFACE_FINISHES_REPOSITORY = new InjectionToken<SurfaceFinishesRepository>(
  'SURFACE_FINISHES_REPOSITORY'
);
