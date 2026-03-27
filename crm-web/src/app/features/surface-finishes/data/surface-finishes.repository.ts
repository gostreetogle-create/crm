import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SurfaceFinishItem, SurfaceFinishItemInput } from '../model/surface-finish-item';

export interface SurfaceFinishesRepository {
  getItems(): Observable<SurfaceFinishItem[]>;
  create(input: SurfaceFinishItemInput): void;
  update(id: string, input: SurfaceFinishItemInput): void;
  remove(id: string): void;
}

export const SURFACE_FINISHES_REPOSITORY = new InjectionToken<SurfaceFinishesRepository>(
  'SURFACE_FINISHES_REPOSITORY'
);
