import { HttpInterceptorFn } from '@angular/common/http';
import { AUTH_TOKEN_STORAGE_KEY } from './session-auth.service';

function readTokenFromCookie(): string | null {
  try {
    const match = document.cookie
      .split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${AUTH_TOKEN_STORAGE_KEY}=`));
    if (!match) return null;
    const raw = match.slice(AUTH_TOKEN_STORAGE_KEY.length + 1);
    return raw ? decodeURIComponent(raw) : null;
  } catch {
    return null;
  }
}

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  if (req.url.startsWith('/api/auth/login')) {
    return next(req);
  }
  try {
    const t =
      localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
      sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
      readTokenFromCookie();
    if (t) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }));
    }
  } catch {
    // restricted environments
  }
  return next(req);
};
