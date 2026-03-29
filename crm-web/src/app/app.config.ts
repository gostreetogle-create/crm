import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { API_CONFIG, DEFAULT_API_CONFIG } from './core/api/api-config';
import { ROLES_REPOSITORY } from './features/roles/data/roles.repository';
import { RolesMockRepository } from './features/roles/data/roles.mock-repository';
import { USERS_REPOSITORY } from './features/users/data/users.repository';
import { UsersMockRepository } from './features/users/data/users.mock-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(appRoutes),
    { provide: API_CONFIG, useValue: DEFAULT_API_CONFIG },
    RolesMockRepository,
    { provide: ROLES_REPOSITORY, useExisting: RolesMockRepository },
    UsersMockRepository,
    { provide: USERS_REPOSITORY, useExisting: UsersMockRepository },
  ],
};
