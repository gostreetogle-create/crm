import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, concatMap, from, of, switchMap, take } from 'rxjs';
import { RoleItem, RoleItemInput } from '../model/role-item';
import { ROLES_REPOSITORY } from '../data/roles.repository';
import { compareRolesBySortOrder } from '../utils/role-sort';

const AUTH_TOKEN_STORAGE_KEY = 'crm.auth.token';

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

@Injectable({ providedIn: 'root' })
export class RolesStore {
  private readonly repo = inject(ROLES_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = signal<RoleItem[]>([]);

  constructor() {
    const snap = this.repo.getSnapshot?.();
    if (snap?.length) {
      this.items.set(snap);
    }
    if (!this.hasAuthToken()) {
      return;
    }
    this.loadItems();
  }

  loadItems(): void {
    this.repo
      .getItems()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .pipe(
        catchError((err) => {
          // До входа (без JWT) `/api/roles` ожидаемо отвечает 401 — это не ошибка приложения.
          // Логируем только неожиданные кейсы, чтобы не пугать шумом в консоли.
          const status = typeof err?.status === 'number' ? err.status : null;
          if (status !== 401) {
            console.warn('[RolesStore] Failed to load roles (will use empty list):', err);
          }
          return of([] as RoleItem[]);
        }),
      )
      .subscribe((items) => this.items.set(items));
  }

  clearItems(): void {
    this.items.set([]);
  }

  readonly rolesData = computed(() =>
    [...this.items()]
      .sort(compareRolesBySortOrder)
      .map((r) => ({
        id: r.id,
        hubLine: r.name,
        code: r.code,
        notes: r.notes ?? '—',
        isActiveLabel: r.isActive ? 'Да' : 'Нет',
        isSystemLabel: r.isSystem ? 'Да' : 'Нет',
      })),
  );

  /** Колонки матрицы «Админ-настройки»: только активные роли, слева направо по возрастанию `sortOrder`. */
  readonly matrixRoleColumns = computed(() =>
    [...this.items()].filter((r) => r.isActive).sort(compareRolesBySortOrder),
  );

  roleExists(id: string): boolean {
    return this.items().some((x) => x.id === id);
  }

  roleById(id: string): RoleItem | undefined {
    return this.items().find((x) => x.id === id);
  }

  create(input: RoleItemInput): void {
    this.repo
      .create(input)
      .pipe(
        switchMap(() => this.repo.getItems().pipe(take(1))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.items.set(items));
  }

  update(id: string, input: RoleItemInput): void {
    this.repo
      .update(id, input)
      .pipe(
        switchMap(() => this.repo.getItems().pipe(take(1))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.items.set(items));
  }

  remove(id: string): void {
    this.repo
      .remove(id)
      .pipe(
        switchMap(() => this.repo.getItems().pipe(take(1))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.items.set(items));
  }

  createMany(rows: readonly RoleItemInput[]): void {
    from(rows)
      .pipe(
        concatMap((row) => this.repo.create(row)),
        switchMap(() => this.repo.getItems().pipe(take(1))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.items.set(items));
  }

  private hasAuthToken(): boolean {
    try {
      return !!(
        localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
        sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
        readTokenFromCookie()
      );
    } catch {
      return false;
    }
  }
}
