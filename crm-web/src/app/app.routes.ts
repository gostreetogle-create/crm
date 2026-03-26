import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/materials', pathMatch: 'full' },
  {
    path: 'materials',
    loadChildren: () => import('./features/materials/materials.routes').then((m) => m.routes),
  },
  {
    path: 'geometries',
    loadChildren: () => import('./features/geometries/geometries.routes').then((m) => m.routes),
  },
  {
    path: 'material-geometry',
    loadComponent: () =>
      import('./features/material-geometry/pages/material-geometry-page/material-geometry-page').then(
        (m) => m.MaterialGeometryPage
      ),
  },
  {
    path: 'demo',
    loadComponent: () =>
      import('./features/demo/pages/ui-demo-page/ui-demo-page').then((m) => m.UiDemoPage),
  },
  { path: '**', redirectTo: '' },
];
