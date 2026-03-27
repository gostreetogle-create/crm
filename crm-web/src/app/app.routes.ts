import { Route } from '@angular/router';
import { COLORS_REPOSITORY } from './features/colors/data/colors.repository';
import { ColorsMockRepository } from './features/colors/data/colors.mock-repository';
import { ColorsStore } from './features/colors/state/colors.store';
import { COATINGS_REPOSITORY } from './features/coatings/data/coatings.repository';
import { CoatingsMockRepository } from './features/coatings/data/coatings.mock-repository';
import { CoatingsStore } from './features/coatings/state/coatings.store';
import { GEOMETRIES_REPOSITORY } from './features/geometries/data/geometries.repository';
import { GeometriesMockRepository } from './features/geometries/data/geometries.mock-repository';
import { GeometriesStore } from './features/geometries/state/geometries.store';
import { MATERIALS_REPOSITORY } from './features/materials/data/materials.repository';
import { MaterialsMockRepository } from './features/materials/data/materials.mock-repository';
import { MaterialsStore } from './features/materials/state/materials.store';
import { SURFACE_FINISHES_REPOSITORY } from './features/surface-finishes/data/surface-finishes.repository';
import { SurfaceFinishesMockRepository } from './features/surface-finishes/data/surface-finishes.mock-repository';
import { SurfaceFinishesStore } from './features/surface-finishes/state/surface-finishes.store';
import { UNITS_REPOSITORY } from './features/units/data/units.repository';
import { UnitsMockRepository } from './features/units/data/units.mock-repository';
import { UnitsStore } from './features/units/state/units.store';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/dictionaries', pathMatch: 'full' },
  {
    path: 'dictionaries',
    loadComponent: () =>
      import('./features/dictionaries/pages/dictionaries-page/dictionaries-page').then(
        (m) => m.DictionariesPage
      ),
    providers: [
      MaterialsMockRepository,
      MaterialsStore,
      {
        provide: MATERIALS_REPOSITORY,
        useExisting: MaterialsMockRepository,
      },
      GeometriesMockRepository,
      GeometriesStore,
      {
        provide: GEOMETRIES_REPOSITORY,
        useExisting: GeometriesMockRepository,
      },
      UnitsMockRepository,
      UnitsStore,
      {
        provide: UNITS_REPOSITORY,
        useExisting: UnitsMockRepository,
      },
      ColorsMockRepository,
      ColorsStore,
      {
        provide: COLORS_REPOSITORY,
        useExisting: ColorsMockRepository,
      },
      CoatingsMockRepository,
      CoatingsStore,
      {
        provide: COATINGS_REPOSITORY,
        useExisting: CoatingsMockRepository,
      },
      SurfaceFinishesMockRepository,
      SurfaceFinishesStore,
      {
        provide: SURFACE_FINISHES_REPOSITORY,
        useExisting: SurfaceFinishesMockRepository,
      },
    ],
  },
  {
    path: 'materials',
    redirectTo: '/dictionaries',
    pathMatch: 'full',
  },
  {
    path: 'geometries',
    redirectTo: '/dictionaries',
    pathMatch: 'full',
  },
  {
    path: 'demo',
    loadComponent: () =>
      import('./features/demo/pages/ui-demo-page/ui-demo-page').then((m) => m.UiDemoPage),
  },
  { path: '**', redirectTo: '' },
];
