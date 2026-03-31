import { HttpInterceptorFn } from '@angular/common/http';
import { readAuthTokenFromStorage } from '@srm/auth-session-core';

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  if (req.url.startsWith('/api/auth/login')) {
    return next(req);
  }
  const token = readAuthTokenFromStorage();
  if (token) {
    try {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    } catch {
      // restricted environments
    }
  }
  return next(req);
};


