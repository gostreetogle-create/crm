import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoleItem, RoleItemInput } from '../model/role-item';
import { ROLES_REPOSITORY } from '../data/roles.repository';
import { compareRolesBySortOrder } from '../utils/role-sort';

@Injectable({ providedIn: 'root' })
export class RolesStore {
  private readonly repo = inject(ROLES_REPOSITORY);
  readonly items = signal<RoleItem[]>([]);

  constructor() {
    const snap = this.repo.getSnapshot?.();
    if (snap?.length) {
      this.items.set(snap);
    }
    this.repo
      .getItems()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((items) => this.items.set(items));
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
    this.repo.create(input);
  }

  update(id: string, input: RoleItemInput): void {
    this.repo.update(id, input);
  }

  remove(id: string): void {
    this.repo.remove(id);
  }

  createMany(rows: readonly RoleItemInput[]): void {
    for (const row of rows) {
      this.repo.create(row);
    }
  }
}
