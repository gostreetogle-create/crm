import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SurfaceFinishItem, SurfaceFinishItemInput } from '../model/surface-finish-item';

export interface SurfaceFinishesRepository {
  getItems(): Observable<SurfaceFinishItem[]>;
  create(input: SurfaceFinishItemInput): Observable<SurfaceFinishItem>;
  update(id: string, input: SurfaceFinishItemInput): Observable<SurfaceFinishItem>;
  remove(id: string): Observable<void>;
}

export const SURFACE_FINISHES_REPOSITORY = new InjectionToken<SurfaceFinishesRepository>(
  'SURFACE_FINISHES_REPOSITORY'
);
