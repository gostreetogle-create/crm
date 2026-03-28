import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'crm.authenticated';

/** Учётка до появления бэкенда (согласовано для локальной разработки). */
export const DEV_BOOTSTRAP_USERNAME = 'admin';
export const DEV_BOOTSTRAP_PASSWORD = 'admin';

/**
 * Локальная сессия входа (без реального бэкенда): guard маршрутов и главный экран.
 * Пока система в разработке — вход только парами из констант выше.
 */
@Injectable({ providedIn: 'root' })
export class SessionAuthService {
  private readonly authenticated = signal(this.readStored());

  readonly isAuthenticated = computed(() => this.authenticated());

  login(username: string, password: string): boolean {
    const u = username.trim();
    const p = password;
    if (u !== DEV_BOOTSTRAP_USERNAME || p !== DEV_BOOTSTRAP_PASSWORD) {
      return false;
    }
    this.authenticated.set(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // restricted environments
    }
    return true;
  }

  logout(): void {
    this.authenticated.set(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }

  private readStored(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
