import type { Provider } from '@angular/core';
import { DictionariesMaterialStandaloneFlowService } from './dictionaries-material-standalone-flow.service';
import { selectRepository } from '@srm/platform-core';
import { API_CONFIG, type ApiConfig } from '@srm/platform-core';
import {
  COLORS_REPOSITORY,
  ColorsHttpRepository,
  ColorsMockRepository,
} from '@srm/colors-data-access';
import {
  CLIENTS_REPOSITORY,
  ClientsHttpRepository,
  ClientsMockRepository,
} from '@srm/clients-data-access';
import {
  ClientsStore,
  CoatingsStore,
  ColorsStore,
  GeometriesStore,
  MaterialCharacteristicsStore,
  MaterialsStore,
  OrganizationsStore,
  ProductionWorkTypesStore,
  SurfaceFinishesStore,
  UnitsStore,
} from '@srm/dictionaries-state';
import {
  COATINGS_REPOSITORY,
  CoatingsHttpRepository,
  CoatingsMockRepository,
} from '@srm/coatings-data-access';
import {
  GEOMETRIES_REPOSITORY,
  GeometriesHttpRepository,
  GeometriesMockRepository,
} from '@srm/geometries-data-access';
import {
  MATERIAL_CHARACTERISTICS_REPOSITORY,
  MaterialCharacteristicsHttpRepository,
  MaterialCharacteristicsMockRepository,
} from '@srm/material-characteristics-data-access';
import {
  MATERIALS_REPOSITORY,
  MaterialsHttpRepository,
  MaterialsMockRepository,
} from '@srm/materials-data-access';
import { ORGANIZATIONS_REPOSITORY } from '@srm/organizations-data-access';
import { OrganizationsHttpRepository } from '@srm/organizations-data-access';
import { OrganizationsMockRepository } from '@srm/organizations-data-access';
import {
  PRODUCTION_WORK_TYPES_REPOSITORY,
  ProductionWorkTypesHttpRepository,
  ProductionWorkTypesMockRepository,
} from '@srm/production-work-types-data-access';
import {
  SURFACE_FINISHES_REPOSITORY,
  SurfaceFinishesHttpRepository,
  SurfaceFinishesMockRepository,
} from '@srm/surface-finishes-data-access';
import {
  UNITS_REPOSITORY,
  UnitsHttpRepository,
  UnitsMockRepository,
} from '@srm/units-data-access';

/**
 * Route-level providers for the unified dictionaries hub (`/справочники`).
 * Keeps `app.routes.ts` readable; add new dictionary DI here.
 */
export const DICTIONARIES_ROUTE_PROVIDERS: Provider[] = [
  DictionariesMaterialStandaloneFlowService,
  MaterialsMockRepository,
  MaterialsHttpRepository,
  MaterialsStore,
  {
    provide: MATERIALS_REPOSITORY,
    useFactory: (
      apiConfig: ApiConfig,
      mockRepo: MaterialsMockRepository,
      httpRepo: MaterialsHttpRepository,
    ) => selectRepository({ apiConfig, mockRepo, httpRepo }),
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
    ) => selectRepository({ apiConfig, mockRepo, httpRepo }),
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
    ) => selectRepository({ apiConfig, mockRepo, httpRepo }),
    deps: [API_CONFIG, GeometriesMockRepository, GeometriesHttpRepository],
  },
  UnitsMockRepository,
  UnitsHttpRepository,
  UnitsStore,
  {
    provide: UNITS_REPOSITORY,
    useFactory: (apiConfig: ApiConfig, mockRepo: UnitsMockRepository, httpRepo: UnitsHttpRepository) =>
      selectRepository({ apiConfig, mockRepo, httpRepo }),
    deps: [API_CONFIG, UnitsMockRepository, UnitsHttpRepository],
  },
  ColorsMockRepository,
  ColorsHttpRepository,
  ColorsStore,
  {
    provide: COLORS_REPOSITORY,
    useFactory: (apiConfig: ApiConfig, mockRepo: ColorsMockRepository, httpRepo: ColorsHttpRepository) =>
      selectRepository({ apiConfig, mockRepo, httpRepo }),
    deps: [API_CONFIG, ColorsMockRepository, ColorsHttpRepository],
  },
  CoatingsMockRepository,
  CoatingsHttpRepository,
  CoatingsStore,
  {
    provide: COATINGS_REPOSITORY,
    useFactory: (apiConfig: ApiConfig, mockRepo: CoatingsMockRepository, httpRepo: CoatingsHttpRepository) =>
      selectRepository({ apiConfig, mockRepo, httpRepo }),
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
    ) => selectRepository({ apiConfig, mockRepo, httpRepo }),
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
    ) => selectRepository({ apiConfig, mockRepo, httpRepo }),
    deps: [API_CONFIG, ProductionWorkTypesMockRepository, ProductionWorkTypesHttpRepository],
  },
  ClientsMockRepository,
  ClientsHttpRepository,
  ClientsStore,
  {
    provide: CLIENTS_REPOSITORY,
    useFactory: (apiConfig: ApiConfig, mockRepo: ClientsMockRepository, httpRepo: ClientsHttpRepository) =>
      selectRepository({ apiConfig, mockRepo, httpRepo }),
    deps: [API_CONFIG, ClientsMockRepository, ClientsHttpRepository],
  },
  OrganizationsMockRepository,
  OrganizationsHttpRepository,
  OrganizationsStore,
  {
    provide: ORGANIZATIONS_REPOSITORY,
    useFactory: (
      apiConfig: ApiConfig,
      mockRepo: OrganizationsMockRepository,
      httpRepo: OrganizationsHttpRepository,
    ) => selectRepository({ apiConfig, mockRepo, httpRepo }),
    deps: [API_CONFIG, OrganizationsMockRepository, OrganizationsHttpRepository],
  },
];



