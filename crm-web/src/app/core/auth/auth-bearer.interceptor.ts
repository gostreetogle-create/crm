import { HttpInterceptorFn } from '@angular/common/http';
import { AUTH_TOKEN_STORAGE_KEY } from './session-auth.service';

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  if (req.url.startsWith('/api/auth/login')) {
    return next(req);
  }
  try {
    const t = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (t) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }));
    }
  } catch {
    // restricted environments
  }
  return next(req);
};
