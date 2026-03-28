import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'crm.authenticated';

/**
 * Локальная сессия входа (без реального бэкенда): достаточно для макета главного экрана и guard маршрутов.
 */
@Injectable({ providedIn: 'root' })
export class SessionAuthService {
  private readonly authenticated = signal(this.readStored());

  readonly isAuthenticated = computed(() => this.authenticated());

  login(_username: string, _password: string): boolean {
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
