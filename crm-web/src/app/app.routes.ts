import { Route } from '@angular/router';
import { API_CONFIG, ApiConfig } from './core/api/api-config';
import { authGuard } from './core/auth/auth.guard';
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
import { MATERIAL_CHARACTERISTICS_REPOSITORY } from './features/material-characteristics/data/material-characteristics.repository';
import { MaterialCharacteristicsMockRepository } from './features/material-characteristics/data/material-characteristics.mock-repository';
import { MaterialCharacteristicsStore } from './features/material-characteristics/state/material-characteristics.store';
import { SURFACE_FINISHES_REPOSITORY } from './features/surface-finishes/data/surface-finishes.repository';
import { SurfaceFinishesMockRepository } from './features/surface-finishes/data/surface-finishes.mock-repository';
import { SurfaceFinishesStore } from './features/surface-finishes/state/surface-finishes.store';
import { PRODUCTION_WORK_TYPES_REPOSITORY } from './features/production-work-types/data/production-work-types.repository';
import { ProductionWorkTypesMockRepository } from './features/production-work-types/data/production-work-types.mock-repository';
import { ProductionWorkTypesStore } from './features/production-work-types/state/production-work-types.store';
import { UNITS_REPOSITORY } from './features/units/data/units.repository';
import { UnitsHttpRepository } from './features/units/data/units.http-repository';
import { UnitsMockRepository } from './features/units/data/units.mock-repository';
import { UnitsStore } from './features/units/state/units.store';
import { CLIENTS_REPOSITORY } from './features/clients/data/clients.repository';
import { ClientsMockRepository } from './features/clients/data/clients.mock-repository';
import { ClientsStore } from './features/clients/state/clients.store';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPage),
  },
  {
    path: 'dictionaries',
    canActivate: [authGuard],
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
      MaterialCharacteristicsMockRepository,
      MaterialCharacteristicsStore,
      {
        provide: MATERIAL_CHARACTERISTICS_REPOSITORY,
        useExisting: MaterialCharacteristicsMockRepository,
      },
      GeometriesMockRepository,
      GeometriesStore,
      {
        provide: GEOMETRIES_REPOSITORY,
        useExisting: GeometriesMockRepository,
      },
      UnitsMockRepository,
      UnitsHttpRepository,
      UnitsStore,
      {
        provide: UNITS_REPOSITORY,
        useFactory: (apiConfig: ApiConfig, mockRepo: UnitsMockRepository, httpRepo: UnitsHttpRepository) =>
          apiConfig.useMockRepositories ? mockRepo : httpRepo,
        deps: [API_CONFIG, UnitsMockRepository, UnitsHttpRepository],
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
      ProductionWorkTypesMockRepository,
      ProductionWorkTypesStore,
      {
        provide: PRODUCTION_WORK_TYPES_REPOSITORY,
        useExisting: ProductionWorkTypesMockRepository,
      },
      ClientsMockRepository,
      ClientsStore,
      {
        provide: CLIENTS_REPOSITORY,
        useExisting: ClientsMockRepository,
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
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/demo/pages/ui-demo-page/ui-demo-page').then((m) => m.UiDemoPage),
  },
  { path: '**', redirectTo: '' },
];
