import { AUTH_TOKEN_STORAGE_KEY } from './auth-session.contracts';

export function readAuthTokenFromCookie(): string | null {
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

export function readAuthTokenFromStorage(): string | null {
  try {
    return (
      localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
      sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
      readAuthTokenFromCookie()
    );
  } catch {
    return null;
  }
}
