import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { API_CONFIG, ApiConfig, DEFAULT_API_CONFIG } from '@srm/platform-core';
import {
  AUTHZ_ROLE_CONTEXT,
  AUTHZ_SESSION_ACCESS,
  AUTHZ_SYSTEM_ROLE_IDS,
} from '@srm/authz-runtime';
import {
  ROLE_ID_SEED_ACCOUNTANT,
  ROLE_ID_SEED_DIRECTOR,
  ROLE_ID_SYSTEM_ADMIN,
  ROLE_ID_SYSTEM_EDITOR,
  ROLE_ID_SYSTEM_VIEWER,
  ROLES_REPOSITORY,
  RolesHttpRepository,
  RolesMockRepository,
} from '@srm/roles-data-access';
import {
  USERS_REPOSITORY,
  UsersHttpRepository,
  UsersMockRepository,
} from '@srm/users-data-access';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsHttpRepository,
  OrganizationsMockRepository,
} from '@srm/organizations-data-access';
import {
  CLIENTS_REPOSITORY,
  ClientsHttpRepository,
  ClientsMockRepository,
} from '@srm/clients-data-access';
import { authBearerInterceptor, SessionAuthService } from '@srm/auth-session-angular';
import { RolesStore } from '@srm/dictionaries-state';

function authAppInitializerFactory(session: SessionAuthService): () => Promise<void> {
  return () => session.hydrateSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authBearerInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: authAppInitializerFactory,
      deps: [SessionAuthService],
    },
    provideRouter(appRoutes),
    { provide: API_CONFIG, useValue: DEFAULT_API_CONFIG },
    {
      provide: AUTHZ_SYSTEM_ROLE_IDS,
      useValue: {
        admin: ROLE_ID_SYSTEM_ADMIN,
        editor: ROLE_ID_SYSTEM_EDITOR,
        viewer: ROLE_ID_SYSTEM_VIEWER,
        director: ROLE_ID_SEED_DIRECTOR,
        accountant: ROLE_ID_SEED_ACCOUNTANT,
      },
    },
    {
      provide: AUTHZ_ROLE_CONTEXT,
      useFactory: (rolesStore: RolesStore) => ({
        roleById: (roleId: string) => {
          const role = rolesStore.roleById(roleId);
          return role ? { id: role.id, code: role.code, isSystem: role.isSystem } : undefined;
        },
      }),
      deps: [RolesStore],
    },
    {
      provide: AUTHZ_SESSION_ACCESS,
      useFactory: (session: SessionAuthService) => ({
        isAuthenticated: () => session.isAuthenticated(),
      }),
      deps: [SessionAuthService],
    },
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
    OrganizationsMockRepository,
    OrganizationsHttpRepository,
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useFactory: (
        apiConfig: ApiConfig,
        mockRepo: OrganizationsMockRepository,
        httpRepo: OrganizationsHttpRepository,
      ) => (apiConfig.useMockRepositories ? mockRepo : httpRepo),
      deps: [API_CONFIG, OrganizationsMockRepository, OrganizationsHttpRepository],
    },
    ClientsMockRepository,
    ClientsHttpRepository,
    {
      provide: CLIENTS_REPOSITORY,
      useFactory: (apiConfig: ApiConfig, mockRepo: ClientsMockRepository, httpRepo: ClientsHttpRepository) =>
        apiConfig.useMockRepositories ? mockRepo : httpRepo,
      deps: [API_CONFIG, ClientsMockRepository, ClientsHttpRepository],
    },
  ],
};



