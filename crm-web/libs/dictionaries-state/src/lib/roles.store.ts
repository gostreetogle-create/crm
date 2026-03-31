import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, concatMap, from, of, switchMap, take, throwError } from 'rxjs';
import { readAuthTokenFromStorage } from '@srm/auth-session-core';
import { RoleItem, RoleItemInput } from '@srm/roles-data-access';
import { ROLES_REPOSITORY } from '@srm/roles-data-access';
import { compareRolesBySortOrder } from '@srm/dictionaries-utils';

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
        catchError((err: unknown) => {
          // Код роли уже есть в БД (например admin из сида), а локальный список ещё пустой — подтягиваем с сервера.
          if (err instanceof HttpErrorResponse && err.status === 409) {
            return of(null);
          }
          return throwError(() => err);
        }),
        switchMap(() => this.repo.getItems().pipe(take(1))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.items.set(items));
  }

  update(id: string, input: RoleItemInput): void {
    this.repo
      .update(id, input)
      .pipe(
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 409) {
            return of(null);
          }
          return throwError(() => err);
        }),
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
        concatMap((row) =>
          this.repo.create(row).pipe(
            catchError((err: unknown) => {
              if (err instanceof HttpErrorResponse && err.status === 409) {
                return of(null);
              }
              return throwError(() => err);
            }),
          ),
        ),
        switchMap(() => this.repo.getItems().pipe(take(1))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.items.set(items));
  }

  private hasAuthToken(): boolean {
    return !!readAuthTokenFromStorage();
  }
}


