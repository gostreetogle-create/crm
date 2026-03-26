import { Route } from '@angular/router';
import {
  MATERIALS_REPOSITORY,
} from './data/materials.repository';
import { MaterialsMockRepository } from './data/materials.mock-repository';
import { MaterialsStore } from './state/materials.store';

export const routes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/materials-crud-page/materials-crud-page').then((m) => m.MaterialsCrudPage),
    providers: [
      MaterialsMockRepository,
      MaterialsStore,
      {
        provide: MATERIALS_REPOSITORY,
        useExisting: MaterialsMockRepository,
      },
    ],
  },
];
