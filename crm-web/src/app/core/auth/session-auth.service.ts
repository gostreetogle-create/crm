import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map, of, catchError, tap } from 'rxjs';
import { API_CONFIG } from '../api/api-config';
import { PermissionsService } from './permissions.service';
import { ROLE_ID_SYSTEM_ADMIN } from '../../features/roles/data/roles.seed';

export const AUTH_TOKEN_STORAGE_KEY = 'crm.auth.token';
const LEGACY_STORAGE_KEY = 'crm.authenticated';

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

/**
 * Сессия: при реальном API — JWT в sessionStorage и роль с сервера.
 * Моковый вход admin/admin — только в dev (`ng serve`), не в production-сборке.
 */
@Injectable({ providedIn: 'root' })
export class SessionAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly permissions = inject(PermissionsService);

  /** Локальный admin/admin — только `ng serve` + `useMockRepositories`, не production bundle. */
  private isMockAuthPath(): boolean {
    return this.apiConfig.useMockRepositories && isDevMode();
  }

  private readonly authenticated = signal(this.computeInitialAuthenticated());

  readonly isAuthenticated = computed(() => this.authenticated());
  readonly useMockAuth = computed(() => this.isMockAuthPath());

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
    return firstValueFrom(this.http.get<MeResponse>(this.apiUrl('/auth/me')))
      .then((r) => {
        this.applyServerUser(r.user);
        this.authenticated.set(true);
      })
      .catch(() => {
        this.clearTokens();
        this.authenticated.set(false);
        this.permissions.resetRoleAfterLogout();
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
    this.clearTokens();
    this.authenticated.set(false);
    this.permissions.resetRoleAfterLogout();
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
    try {
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, r.token);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // no-op
    }
    this.applyServerUser(r.user);
    this.authenticated.set(true);
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
    try {
      return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private clearTokens(): void {
    try {
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // no-op
    }
  }
}
