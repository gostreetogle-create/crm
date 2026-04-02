import { HttpInterceptorFn } from '@angular/common/http';
import { readAuthTokenFromStorage } from '@srm/auth-session-core';

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = (() => {
    if (req.url.startsWith('/api/')) return true;
    // For absolute URLs (e.g. http://127.0.0.1:3000/api/...)
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      try {
        return new URL(req.url).pathname.startsWith('/api/');
      } catch {
        return false;
      }
    }
    return false;
  })();

  if (!isApiRequest) {
    return next(req);
  }

  const apiPath = (() => {
    if (req.url.startsWith('/')) return req.url;
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      try {
        return new URL(req.url).pathname;
      } catch {
        return '';
      }
    }
    return '';
  })();

  if (apiPath === '/api/auth/login') {
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


