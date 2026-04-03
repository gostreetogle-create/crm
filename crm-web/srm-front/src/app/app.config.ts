import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { API_CONFIG, SRM_SHELL_ACTIVE } from '@srm/platform-core';
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
} from '@srm/roles-data-access';
import { USERS_REPOSITORY, UsersHttpRepository } from '@srm/users-data-access';
import { ORGANIZATIONS_REPOSITORY, OrganizationsHttpRepository } from '@srm/organizations-data-access';
import { CLIENTS_REPOSITORY, ClientsHttpRepository } from '@srm/clients-data-access';
import { authBearerInterceptor, SessionAuthService } from '@srm/auth-session-angular';
import { RolesStore } from '@srm/dictionaries-state';
import { appRoutes } from './app.routes';
import { SrmGlobalErrorHandler } from './global-error.handler';

function authAppInitializerFactory(session: SessionAuthService): () => Promise<void> {
  return () => session.hydrateSession();
}

/**
 * Локальный `nx serve`: прокси /api часто не подхватывается → 404 на :4200.
 * В dev на localhost шлём запросы сразу на API (:3000); в prod — относительные URL (тот же origin).
 */
function srmApiConfigFactory(): { baseUrl: string } {
  if (!isDevMode() || typeof window === 'undefined') {
    return { baseUrl: '' };
  }
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { baseUrl: 'http://127.0.0.1:3000' };
  }
  return { baseUrl: '' };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: SrmGlobalErrorHandler },
    { provide: SRM_SHELL_ACTIVE, useValue: true },
    provideHttpClient(withInterceptors([authBearerInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: authAppInitializerFactory,
      deps: [SessionAuthService],
    },
    provideRouter(appRoutes),
    { provide: API_CONFIG, useFactory: srmApiConfigFactory },
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
    RolesHttpRepository,
    { provide: ROLES_REPOSITORY, useExisting: RolesHttpRepository },
    UsersHttpRepository,
    { provide: USERS_REPOSITORY, useExisting: UsersHttpRepository },
    OrganizationsHttpRepository,
    { provide: ORGANIZATIONS_REPOSITORY, useExisting: OrganizationsHttpRepository },
    ClientsHttpRepository,
    { provide: CLIENTS_REPOSITORY, useExisting: ClientsHttpRepository },
  ],
};
