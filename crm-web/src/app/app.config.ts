import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { API_CONFIG, ApiConfig, DEFAULT_API_CONFIG } from './core/api/api-config';
import { ROLES_REPOSITORY } from './features/roles/data/roles.repository';
import { RolesMockRepository } from './features/roles/data/roles.mock-repository';
import { RolesHttpRepository } from './features/roles/data/roles.http-repository';
import { USERS_REPOSITORY } from './features/users/data/users.repository';
import { UsersMockRepository } from './features/users/data/users.mock-repository';
import { UsersHttpRepository } from './features/users/data/users.http-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(appRoutes),
    { provide: API_CONFIG, useValue: DEFAULT_API_CONFIG },
    RolesMockRepository,
    RolesHttpRepository,
    {
      provide: ROLES_REPOSITORY,
      useFactory: (apiConfig: ApiConfig, mockRepo: RolesMockRepository, httpRepo: RolesHttpRepository) =>
        apiConfig.useMockRepositories ? mockRepo : httpRepo,
      deps: [API_CONFIG, RolesMockRepository, RolesHttpRepository],
    },
    UsersMockRepository,
    UsersHttpRepository,
    {
      provide: USERS_REPOSITORY,
      useFactory: (apiConfig: ApiConfig, mockRepo: UsersMockRepository, httpRepo: UsersHttpRepository) =>
        apiConfig.useMockRepositories ? mockRepo : httpRepo,
      deps: [API_CONFIG, UsersMockRepository, UsersHttpRepository],
    },
  ],
};
