import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map, of, catchError, tap, timeout } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import {
  AUTH_HYDRATE_ME_RETRY_DELAYS_MS,
  AUTH_HYDRATE_ME_TIMEOUT_MS,
  AUTH_TOKEN_COOKIE_MAX_AGE_SEC,
  AUTH_TOKEN_STORAGE_KEY,
  DEV_BOOTSTRAP_PASSWORD,
  DEV_BOOTSTRAP_USERNAME,
  LEGACY_AUTH_STORAGE_KEY,
  describeAuthHttpError,
  decodeJwtRoleId,
  isUnauthorizedHttpError,
  type AuthUserDto,
  type LoginResponse,
  type MeResponse,
  readAuthTokenFromStorage,
} from '@srm/auth-session-core';
import { PermissionsService } from '@srm/authz-runtime';
import { ROLE_ID_SYSTEM_ADMIN } from '@srm/roles-data-access';
import { RolesStore } from '@srm/dictionaries-state';

export {
  AUTH_TOKEN_STORAGE_KEY,
  DEV_BOOTSTRAP_PASSWORD,
  DEV_BOOTSTRAP_USERNAME,
  type AuthUserDto,
  type LoginResponse,
  type MeResponse,
} from '@srm/auth-session-core';

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
        sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
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
        if (isUnauthorizedHttpError(error)) {
          this.debug('hydrateSession unauthorized, performing logout', describeAuthHttpError(error));
          this.resetHydrateRetryState();
          this.clearTokens();
          this.authenticated.set(false);
          this.permissions.resetRoleAfterLogout();
          this.rolesStore.clearItems();
          return;
        }
        this.debug('hydrateSession temporary failure, scheduling retry', describeAuthHttpError(error));
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
    return firstValueFrom(
      this.http.get<MeResponse>(this.apiUrl('/auth/me')).pipe(timeout(AUTH_HYDRATE_ME_TIMEOUT_MS)),
    );
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
    if (this.hydrateRetryAttempt >= AUTH_HYDRATE_ME_RETRY_DELAYS_MS.length) {
      this.debug('retry limit reached, keeping current session state');
      return;
    }
    const delay = AUTH_HYDRATE_ME_RETRY_DELAYS_MS[this.hydrateRetryAttempt];
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
          if (isUnauthorizedHttpError(error)) {
            this.debug('retry unauthorized, performing logout', describeAuthHttpError(error));
            this.resetHydrateRetryState();
            this.clearTokens();
            this.authenticated.set(false);
            this.permissions.resetRoleAfterLogout();
            this.rolesStore.clearItems();
            return;
          }
          this.debug('retry temporary failure, scheduling next attempt', describeAuthHttpError(error));
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
      sessionStorage.setItem(LEGACY_AUTH_STORAGE_KEY, '1');
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // no-op
    }
    this.permissions.setRole(ROLE_ID_SYSTEM_ADMIN);
    this.authenticated.set(true);
  }

  private readLegacyStored(): boolean {
    try {
      return sessionStorage.getItem(LEGACY_AUTH_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readToken(): string | null {
    return readAuthTokenFromStorage();
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
      sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    } catch {
      // no-op
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




