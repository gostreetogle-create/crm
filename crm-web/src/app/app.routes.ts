import { Route } from '@angular/router';
import { API_CONFIG, ApiConfig } from './core/api/api-config';
import { authGuard, permissionGuard } from './core/auth/public-api';
import { COLORS_REPOSITORY } from './features/colors/data/colors.repository';
import { ColorsMockRepository } from './features/colors/data/colors.mock-repository';
import { ColorsHttpRepository } from './features/colors/data/colors.http-repository';
import { ColorsStore } from './features/colors/state/colors.store';
import { COATINGS_REPOSITORY } from './features/coatings/data/coatings.repository';
import { CoatingsMockRepository } from './features/coatings/data/coatings.mock-repository';
import { CoatingsHttpRepository } from './features/coatings/data/coatings.http-repository';
import { CoatingsStore } from './features/coatings/state/coatings.store';
import { GEOMETRIES_REPOSITORY } from './features/geometries/data/geometries.repository';
import { GeometriesMockRepository } from './features/geometries/data/geometries.mock-repository';
import { GeometriesHttpRepository } from './features/geometries/data/geometries.http-repository';
import { GeometriesStore } from './features/geometries/state/geometries.store';
import { MATERIALS_REPOSITORY } from './features/materials/data/materials.repository';
import { MaterialsMockRepository } from './features/materials/data/materials.mock-repository';
import { MaterialsHttpRepository } from './features/materials/data/materials.http-repository';
import { MaterialsStore } from './features/materials/state/materials.store';
import { MATERIAL_CHARACTERISTICS_REPOSITORY } from './features/material-characteristics/data/material-characteristics.repository';
import { MaterialCharacteristicsMockRepository } from './features/material-characteristics/data/material-characteristics.mock-repository';
import { MaterialCharacteristicsHttpRepository } from './features/material-characteristics/data/material-characteristics.http-repository';
import { MaterialCharacteristicsStore } from './features/material-characteristics/state/material-characteristics.store';
import { SURFACE_FINISHES_REPOSITORY } from './features/surface-finishes/data/surface-finishes.repository';
import { SurfaceFinishesMockRepository } from './features/surface-finishes/data/surface-finishes.mock-repository';
import { SurfaceFinishesHttpRepository } from './features/surface-finishes/data/surface-finishes.http-repository';
import { SurfaceFinishesStore } from './features/surface-finishes/state/surface-finishes.store';
import { PRODUCTION_WORK_TYPES_REPOSITORY } from './features/production-work-types/data/production-work-types.repository';
import { ProductionWorkTypesMockRepository } from './features/production-work-types/data/production-work-types.mock-repository';
import { ProductionWorkTypesHttpRepository } from './features/production-work-types/data/production-work-types.http-repository';
import { ProductionWorkTypesStore } from './features/production-work-types/state/production-work-types.store';
import { UNITS_REPOSITORY } from './features/units/data/units.repository';
import { UnitsHttpRepository } from './features/units/data/units.http-repository';
import { UnitsMockRepository } from './features/units/data/units.mock-repository';
import { UnitsStore } from './features/units/state/units.store';
import { CLIENTS_REPOSITORY } from './features/clients/data/clients.repository';
import { ClientsMockRepository } from './features/clients/data/clients.mock-repository';
import { ClientsHttpRepository } from './features/clients/data/clients.http-repository';
import { ClientsStore } from './features/clients/state/clients.store';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPage),
  },
  {
    path: 'dictionaries',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.dictionaries' },
    loadComponent: () =>
      import('./features/dictionaries/pages/dictionaries-page/dictionaries-page').then(
        (m) => m.DictionariesPage
      ),
    providers: [
      MaterialsMockRepository,
      MaterialsHttpRepository,
      MaterialsStore,
      {
        provide: MATERIALS_REPOSITORY,
        useFactory: (
          apiConfig: ApiConfig,
          mockRepo: MaterialsMockRepository,
          httpRepo: MaterialsHttpRepository,
        ) => (apiConfig.useMockRepositories ? mockRepo : httpRepo),
        deps: [API_CONFIG, MaterialsMockRepository, MaterialsHttpRepository],
      },
      MaterialCharacteristicsMockRepository,
      MaterialCharacteristicsHttpRepository,
      MaterialCharacteristicsStore,
      {
        provide: MATERIAL_CHARACTERISTICS_REPOSITORY,
        useFactory: (
          apiConfig: ApiConfig,
          mockRepo: MaterialCharacteristicsMockRepository,
          httpRepo: MaterialCharacteristicsHttpRepository,
        ) => (apiConfig.useMockRepositories ? mockRepo : httpRepo),
        deps: [API_CONFIG, MaterialCharacteristicsMockRepository, MaterialCharacteristicsHttpRepository],
      },
      GeometriesMockRepository,
      GeometriesHttpRepository,
      GeometriesStore,
      {
        provide: GEOMETRIES_REPOSITORY,
        useFactory: (
          apiConfig: ApiConfig,
          mockRepo: GeometriesMockRepository,
          httpRepo: GeometriesHttpRepository,
        ) => (apiConfig.useMockRepositories ? mockRepo : httpRepo),
        deps: [API_CONFIG, GeometriesMockRepository, GeometriesHttpRepository],
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
      ColorsHttpRepository,
      ColorsStore,
      {
        provide: COLORS_REPOSITORY,
        useFactory: (apiConfig: ApiConfig, mockRepo: ColorsMockRepository, httpRepo: ColorsHttpRepository) =>
          apiConfig.useMockRepositories ? mockRepo : httpRepo,
        deps: [API_CONFIG, ColorsMockRepository, ColorsHttpRepository],
      },
      CoatingsMockRepository,
      CoatingsHttpRepository,
      CoatingsStore,
      {
        provide: COATINGS_REPOSITORY,
        useFactory: (apiConfig: ApiConfig, mockRepo: CoatingsMockRepository, httpRepo: CoatingsHttpRepository) =>
          apiConfig.useMockRepositories ? mockRepo : httpRepo,
        deps: [API_CONFIG, CoatingsMockRepository, CoatingsHttpRepository],
      },
      SurfaceFinishesMockRepository,
      SurfaceFinishesHttpRepository,
      SurfaceFinishesStore,
      {
        provide: SURFACE_FINISHES_REPOSITORY,
        useFactory: (
          apiConfig: ApiConfig,
          mockRepo: SurfaceFinishesMockRepository,
          httpRepo: SurfaceFinishesHttpRepository,
        ) => (apiConfig.useMockRepositories ? mockRepo : httpRepo),
        deps: [API_CONFIG, SurfaceFinishesMockRepository, SurfaceFinishesHttpRepository],
      },
      ProductionWorkTypesMockRepository,
      ProductionWorkTypesHttpRepository,
      ProductionWorkTypesStore,
      {
        provide: PRODUCTION_WORK_TYPES_REPOSITORY,
        useFactory: (
          apiConfig: ApiConfig,
          mockRepo: ProductionWorkTypesMockRepository,
          httpRepo: ProductionWorkTypesHttpRepository,
        ) => (apiConfig.useMockRepositories ? mockRepo : httpRepo),
        deps: [API_CONFIG, ProductionWorkTypesMockRepository, ProductionWorkTypesHttpRepository],
      },
      ClientsMockRepository,
      ClientsHttpRepository,
      ClientsStore,
      {
        provide: CLIENTS_REPOSITORY,
        useFactory: (apiConfig: ApiConfig, mockRepo: ClientsMockRepository, httpRepo: ClientsHttpRepository) =>
          apiConfig.useMockRepositories ? mockRepo : httpRepo,
        deps: [API_CONFIG, ClientsMockRepository, ClientsHttpRepository],
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
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.demo' },
    loadComponent: () =>
      import('./features/demo/pages/ui-demo-page/ui-demo-page').then((m) => m.UiDemoPage),
  },
  {
    path: 'preferences',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.preferences' },
    loadComponent: () =>
      import('./features/settings/pages/user-preferences-page/user-preferences-page').then(
        (m) => m.UserPreferencesPage
      ),
  },
  {
    path: 'settings',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.admin.settings' },
    loadComponent: () =>
      import('./features/settings/pages/admin-settings-page/admin-settings-page').then(
        (m) => m.AdminSettingsPage
      ),
  },
  { path: '**', redirectTo: '' },
];
