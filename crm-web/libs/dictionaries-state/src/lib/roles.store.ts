import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  concatMap,
  firstValueFrom,
  from,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { toArray } from 'rxjs/operators';
import { readAuthTokenFromStorage } from '@srm/auth-session-core';
import { RoleItem, RoleItemInput } from '@srm/roles-data-access';
import { ROLES_REPOSITORY } from '@srm/roles-data-access';
import { compareRolesBySortOrder } from '@srm/dictionaries-utils';

@Injectable({ providedIn: 'root' })
export class RolesStore {
  private readonly repo = inject(ROLES_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = signal<RoleItem[]>([]);
  /** Дедупликация параллельных запросов (hydrate + конструктор). */
  private loadItemsPromise: Promise<void> | null = null;

  constructor() {
    const snap = this.repo.getSnapshot?.();
    if (snap?.length) {
      this.items.set(snap);
    }
    if (!this.hasAuthToken()) {
      return;
    }
    void this.ensureRolesLoaded();
  }

  loadItems(): void {
    void this.ensureRolesLoaded();
  }

  /**
   * Один запрос к `/api/roles` при первом входе; нужен до `syncMatrixFromServer`, чтобы prune/матрица
   * согласовались со справочником.
   */
  ensureRolesLoaded(): Promise<void> {
    if (this.items().length > 0) {
      return Promise.resolve();
    }
    if (!this.loadItemsPromise) {
      this.loadItemsPromise = firstValueFrom(
        this.repo.getItems().pipe(
          catchError((err) => {
            const status = typeof err?.status === 'number' ? err.status : null;
            if (status !== 401) {
              console.warn('[RolesStore] Failed to load roles (will use empty list):', err);
            }
            return of([] as RoleItem[]);
          }),
        ),
      ).then((items) => {
        this.items.set(items);
      });
    }
    return this.loadItemsPromise;
  }

  clearItems(): void {
    this.items.set([]);
    this.loadItemsPromise = null;
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

  /**
   * Создание роли. Подписка — у вызывающего (чтобы можно было `finalize` / один POST).
   * После успеха список обновляется из API.
   */
  create(input: RoleItemInput): Observable<RoleItem[]> {
    return this.repo.create(input).pipe(
      catchError((err: unknown) => {
        // Код роли уже есть в БД (например admin из сида), а локальный список ещё пустой — подтягиваем с сервера.
        if (err instanceof HttpErrorResponse && err.status === 409) {
          return of(null);
        }
        return throwError(() => err);
      }),
      switchMap(() => this.repo.getItems().pipe(take(1))),
      tap((items) => this.items.set(items)),
    );
  }

  update(id: string, input: RoleItemInput): Observable<RoleItem[]> {
    return this.repo.update(id, input).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 409) {
          return of(null);
        }
        return throwError(() => err);
      }),
      switchMap(() => this.repo.getItems().pipe(take(1))),
      tap((items) => this.items.set(items)),
    );
  }

  remove(id: string): Observable<RoleItem[]> {
    return this.repo.remove(id).pipe(
      switchMap(() => this.repo.getItems().pipe(take(1))),
      tap((items) => this.items.set(items)),
    );
  }

  /**
   * Импорт: последовательные POST, затем один GET списка (раньше после каждой строки дергался getItems).
   */
  createMany(rows: readonly RoleItemInput[]): Observable<RoleItem[]> {
    return from(rows).pipe(
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
      toArray(),
      switchMap(() => this.repo.getItems().pipe(take(1))),
      tap((items) => this.items.set(items)),
    );
  }

  private hasAuthToken(): boolean {
    return !!readAuthTokenFromStorage();
  }
}


