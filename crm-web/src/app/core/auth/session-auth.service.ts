import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, map, of, catchError, tap, timeout } from 'rxjs';
import { API_CONFIG } from '../api/api-config';
import { PermissionsService } from './permissions.service';
import { ROLE_ID_SYSTEM_ADMIN } from '../../features/roles/data/roles.seed';
import { RolesStore } from '../../features/roles/state/roles.store';

export const AUTH_TOKEN_STORAGE_KEY = 'crm.auth.token';
const LEGACY_STORAGE_KEY = 'crm.authenticated';
const AUTH_TOKEN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

/** Учётка до API (только при useMockRepositories). */
export const DEV_BOOTSTRAP_USERNAME = 'admin';
export const DEV_BOOTSTRAP_PASSWORD = 'admin';

export type AuthUserDto = {
  id: string;
  login: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
};

type LoginResponse = { token: string; user: AuthUserDto };
type MeResponse = { user: AuthUserDto };
const HYDRATE_TIMEOUT_MS = 12_000;
const HYDRATE_RETRY_DELAYS_MS = [2_000, 5_000, 10_000];

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}

function describeAuthError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return `HttpErrorResponse(status=${error.status}, url=${error.url ?? 'unknown'})`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/** Без верификации: только чтобы восстановить roleId до первого `/auth/me` (guard на F5). */
function decodeJwtRoleId(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const obj = JSON.parse(json) as { roleId?: unknown };
    return typeof obj.roleId === 'string' ? obj.roleId : null;
  } catch {
    return null;
  }
}

/**
 * Сессия: при реальном API — JWT в sessionStorage и роль с сервера.
 * Моковый вход admin/admin — только в dev (`ng serve`), не в production-сборке.
 */
@Injectable({ providedIn: 'root' })
export class SessionAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly permissions = inject(PermissionsService);
  private readonly rolesStore = inject(RolesStore);

  /** Локальный admin/admin — только `ng serve` + `useMockRepositories`, не production bundle. */
  private isMockAuthPath(): boolean {
    return this.apiConfig.useMockRepositories && isDevMode();
  }

  private readonly authenticated = signal(this.computeInitialAuthenticated());
  private hydrateRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrateRetryAttempt = 0;

  readonly isAuthenticated = computed(() => this.authenticated());
  readonly useMockAuth = computed(() => this.isMockAuthPath());

  private debug(message: string, details?: unknown): void {
    if (!isDevMode()) {
      return;
    }
    if (details === undefined) {
      console.debug(`[SessionAuth] ${message}`);
      return;
    }
    console.debug(`[SessionAuth] ${message}`, details);
  }

  constructor() {
    // До `hydrateSession` guard уже видит роль: если localStorage с ролью недоступен, берём roleId из JWT.
    if (!this.isMockAuthPath()) {
      const t = this.readToken();
      const rid = t ? decodeJwtRoleId(t) : null;
      if (rid) {
        this.permissions.setRole(rid);
      }
    }
  }

  private apiUrl(path: string): string {
    const base = this.apiConfig.baseUrl.replace(/\/$/, '');
    return `${base}/api${path}`;
  }

  /** APP_INITIALIZER: подтянуть профиль по сохранённому токену. */
  hydrateSession(): Promise<void> {
    if (!this.isMockAuthPath()) {
      try {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // no-op
      }
    }
    if (this.isMockAuthPath()) {
      if (this.readLegacyStored()) {
        this.permissions.setRole(ROLE_ID_SYSTEM_ADMIN);
        this.authenticated.set(true);
      }
      return Promise.resolve();
    }
    const token = this.readToken();
    if (!token) {
      this.authenticated.set(false);
      return Promise.resolve();
    }
    const fromJwt = decodeJwtRoleId(token);
    if (fromJwt) {
      this.permissions.setRole(fromJwt);
    }
    return this.requestCurrentUser()
      .then((r) => {
        this.resetHydrateRetryState();
        this.applyServerUser(r.user);
        this.authenticated.set(true);
        this.rolesStore.loadItems();
      })
      .catch((error: unknown) => {
        // Важно: на сетевых/временных ошибках не выбрасываем пользователя из сессии на F5.
        // Жёсткий logout делаем только когда сервер явно сказал "токен недействителен".
        if (isUnauthorizedError(error)) {
          this.debug('hydrateSession unauthorized, performing logout', describeAuthError(error));
          this.resetHydrateRetryState();
          this.clearTokens();
          this.authenticated.set(false);
          this.permissions.resetRoleAfterLogout();
          this.rolesStore.clearItems();
          return;
        }
        this.debug('hydrateSession temporary failure, scheduling retry', describeAuthError(error));
        this.authenticated.set(true);
        this.scheduleHydrateRetry();
      });
  }

  login(username: string, password: string) {
    const u = username.trim();
    const p = password;
    if (this.isMockAuthPath()) {
      const ok = u === DEV_BOOTSTRAP_USERNAME && p === DEV_BOOTSTRAP_PASSWORD;
      if (ok) {
        this.setMockSession();
      }
      return of(ok);
    }
    return this.http
      .post<LoginResponse>(this.apiUrl('/auth/login'), { login: u, password: p })
      .pipe(
        tap((r) => this.persistApiSession(r)),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  logout(): void {
    this.resetHydrateRetryState();
    this.clearTokens();
    this.authenticated.set(false);
    this.permissions.resetRoleAfterLogout();
    this.rolesStore.clearItems();
  }

  private computeInitialAuthenticated(): boolean {
    if (this.isMockAuthPath()) {
      return this.readLegacyStored();
    }
    return !!this.readToken();
  }

  private applyServerUser(user: AuthUserDto): void {
    this.permissions.setRole(user.roleId);
  }

  private persistApiSession(r: LoginResponse): void {
    this.resetHydrateRetryState();
    this.writeToken(r.token);
    this.clearLegacyStored();
    this.applyServerUser(r.user);
    this.authenticated.set(true);
    this.rolesStore.loadItems();
  }

  private requestCurrentUser(): Promise<MeResponse> {
    // Без таймаута запрос мог бы «висеть» бесконечно и блокировать bootstrap.
    return firstValueFrom(this.http.get<MeResponse>(this.apiUrl('/auth/me')).pipe(timeout(HYDRATE_TIMEOUT_MS)));
  }

  private scheduleHydrateRetry(): void {
    if (this.hydrateRetryTimer) {
      this.debug('retry already scheduled, skipping duplicate timer');
      return;
    }
    if (!this.readToken()) {
      this.debug('retry cancelled: token missing');
      this.resetHydrateRetryState();
      return;
    }
    if (this.hydrateRetryAttempt >= HYDRATE_RETRY_DELAYS_MS.length) {
      this.debug('retry limit reached, keeping current session state');
      return;
    }
    const delay = HYDRATE_RETRY_DELAYS_MS[this.hydrateRetryAttempt];
    this.hydrateRetryAttempt += 1;
    this.debug(`scheduling /auth/me retry #${this.hydrateRetryAttempt}`, { delayMs: delay });
    this.hydrateRetryTimer = setTimeout(() => {
      this.hydrateRetryTimer = null;
      this.requestCurrentUser()
        .then((r) => {
          this.debug('retry succeeded, applying server user');
          this.resetHydrateRetryState();
          this.applyServerUser(r.user);
          this.authenticated.set(true);
          this.rolesStore.loadItems();
        })
        .catch((error: unknown) => {
          if (isUnauthorizedError(error)) {
            this.debug('retry unauthorized, performing logout', describeAuthError(error));
            this.resetHydrateRetryState();
            this.clearTokens();
            this.authenticated.set(false);
            this.permissions.resetRoleAfterLogout();
            this.rolesStore.clearItems();
            return;
          }
          this.debug('retry temporary failure, scheduling next attempt', describeAuthError(error));
          this.scheduleHydrateRetry();
        });
    }, delay);
  }

  private resetHydrateRetryState(): void {
    if (this.hydrateRetryTimer) {
      clearTimeout(this.hydrateRetryTimer);
      this.hydrateRetryTimer = null;
    }
    this.hydrateRetryAttempt = 0;
  }

  private setMockSession(): void {
    try {
      sessionStorage.setItem(LEGACY_STORAGE_KEY, '1');
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // no-op
    }
    this.permissions.setRole(ROLE_ID_SYSTEM_ADMIN);
    this.authenticated.set(true);
  }

  private readLegacyStored(): boolean {
    try {
      return sessionStorage.getItem(LEGACY_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readToken(): string | null {
    // 1) localStorage, 2) sessionStorage, 3) cookie fallback.
    try {
      const ls = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (ls) return ls;
    } catch {
      // no-op
    }
    try {
      const ss = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (ss) return ss;
    } catch {
      // no-op
    }
    return this.readTokenFromCookie();
  }

  private clearTokens(): void {
    this.clearStoredToken();
  }

  private writeToken(token: string): void {
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // no-op
    }
    try {
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // no-op
    }
    this.writeTokenCookie(token);
  }

  private clearStoredToken(): void {
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // no-op
    }
    try {
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // no-op
    }
    this.clearTokenCookie();
    this.clearLegacyStored();
  }

  private clearLegacyStored(): void {
    try {
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // no-op
    }
  }

  private readTokenFromCookie(): string | null {
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

  private writeTokenCookie(token: string): void {
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie =
        `${AUTH_TOKEN_STORAGE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${AUTH_TOKEN_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
    } catch {
      // no-op
    }
  }

  private clearTokenCookie(): void {
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${AUTH_TOKEN_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    } catch {
      // no-op
    }
  }
}
