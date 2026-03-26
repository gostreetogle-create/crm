import { Route } from '@angular/router';
import { MaterialGeometryPage } from './features/material-geometry/pages/material-geometry-page/material-geometry-page';
import { MaterialsCrudPage } from './features/materials/pages/materials-crud-page/materials-crud-page';
import { GeometriesCrudPage } from './features/geometries/pages/geometries-crud-page/geometries-crud-page';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/materials', pathMatch: 'full' },
  { path: 'materials', component: MaterialsCrudPage },
  { path: 'geometries', component: GeometriesCrudPage },
  { path: 'material-geometry', component: MaterialGeometryPage },
  { path: '**', redirectTo: '' },
];
