import { InjectionToken } from '@angular/core';

export interface AuthzSessionAccess {
  isAuthenticated(): boolean;
}

export const AUTHZ_SESSION_ACCESS = new InjectionToken<AuthzSessionAccess>('AUTHZ_SESSION_ACCESS', {
  providedIn: 'root',
  factory: () => ({
    isAuthenticated: () => false,
  }),
});
