import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  MATERIAL_GEOMETRY_REPOSITORY,
  MaterialGeometryRepository,
} from './features/material-geometry/data/material-geometry.repository';
import { MaterialGeometryMockRepository } from './features/material-geometry/data/material-geometry.mock-repository';
import { MaterialGeometryHttpRepository } from './features/material-geometry/data/material-geometry.http-repository';
import { API_CONFIG, DEFAULT_API_CONFIG } from './core/api/api-config';
import {
  MATERIALS_REPOSITORY,
  MaterialsRepository,
} from './features/materials/data/materials.repository';
import { MaterialsMockRepository } from './features/materials/data/materials.mock-repository';
import {
  GEOMETRIES_REPOSITORY,
  GeometriesRepository,
} from './features/geometries/data/geometries.repository';
import { GeometriesMockRepository } from './features/geometries/data/geometries.mock-repository';

function materialGeometryRepositoryFactory(): MaterialGeometryRepository {
  const config = inject(API_CONFIG);
  return config.useMockRepositories
    ? inject(MaterialGeometryMockRepository)
    : inject(MaterialGeometryHttpRepository);
}

function materialsRepositoryFactory(): MaterialsRepository {
  // For now materials CRUD works on local mock.
  return inject(MaterialsMockRepository);
}

function geometriesRepositoryFactory(): GeometriesRepository {
  // For now geometries CRUD works on local mock.
  return inject(GeometriesMockRepository);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(appRoutes),
    { provide: API_CONFIG, useValue: DEFAULT_API_CONFIG },
    MaterialGeometryMockRepository,
    MaterialGeometryHttpRepository,
    MaterialsMockRepository,
    GeometriesMockRepository,
    {
      provide: MATERIAL_GEOMETRY_REPOSITORY,
      useFactory: materialGeometryRepositoryFactory,
    },
    {
      provide: MATERIALS_REPOSITORY,
      useFactory: materialsRepositoryFactory,
    },
    {
      provide: GEOMETRIES_REPOSITORY,
      useFactory: geometriesRepositoryFactory,
    },
  ],
};
