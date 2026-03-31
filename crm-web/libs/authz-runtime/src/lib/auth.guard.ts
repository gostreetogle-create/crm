import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTHZ_SESSION_ACCESS } from './authz-session-access.token';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AUTHZ_SESSION_ACCESS);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/']);
};
