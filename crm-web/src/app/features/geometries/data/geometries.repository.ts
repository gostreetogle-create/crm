import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { GeometryItem, GeometryItemInput } from '../model/geometry-item';

export interface GeometriesRepository {
  getItems(): Observable<GeometryItem[]>;
  create(input: GeometryItemInput): Observable<GeometryItem>;
  update(id: string, input: GeometryItemInput): Observable<GeometryItem>;
  remove(id: string): Observable<void>;
}

export const GEOMETRIES_REPOSITORY = new InjectionToken<GeometriesRepository>(
  'GEOMETRIES_REPOSITORY'
);

