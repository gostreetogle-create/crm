import { Route } from '@angular/router';
import {
  GEOMETRIES_REPOSITORY,
} from './data/geometries.repository';
import { GeometriesMockRepository } from './data/geometries.mock-repository';
import { GeometriesStore } from './state/geometries.store';

export const routes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/geometries-crud-page/geometries-crud-page').then((m) => m.GeometriesCrudPage),
    providers: [
      GeometriesMockRepository,
      GeometriesStore,
      {
        provide: GEOMETRIES_REPOSITORY,
        useExisting: GeometriesMockRepository,
      },
    ],
  },
];
