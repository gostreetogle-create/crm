import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MaterialGeometryModel } from '../model/material-geometry-model';

export interface MaterialGeometryRepository {
  getModel(): Observable<MaterialGeometryModel>;
}

export const MATERIAL_GEOMETRY_REPOSITORY = new InjectionToken<MaterialGeometryRepository>(
  'MATERIAL_GEOMETRY_REPOSITORY'
);

