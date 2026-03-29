import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RolesStore } from '../../roles/state/roles.store';
import { UserItem, UserItemInput } from '../model/user-item';
import { USERS_REPOSITORY } from '../data/users.repository';

@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly repo = inject(USERS_REPOSITORY);
  private readonly rolesStore = inject(RolesStore);
  readonly items = signal<UserItem[]>([]);

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

  readonly usersData = computed(() => {
    const roles = this.rolesStore.items();
    const roleName = (id: string): string => roles.find((r) => r.id === id)?.name ?? '—';
    return [...this.items()]
      .sort((a, b) => a.login.localeCompare(b.login, 'ru'))
      .map((u) => ({
        id: u.id,
        hubLine: `${u.fullName} (${u.login})`,
        login: u.login,
        email: u.email || '—',
        phone: u.phone || '—',
        roleLabel: roleName(u.roleId),
      }));
  });

  userById(id: string): UserItem | undefined {
    return this.items().find((x) => x.id === id);
  }

  create(input: UserItemInput): void {
    this.repo.create(input);
  }

  update(id: string, input: UserItemInput): void {
    this.repo.update(id, input);
  }

  remove(id: string): void {
    this.repo.remove(id);
  }

  createMany(rows: readonly UserItemInput[]): void {
    for (const row of rows) {
      this.repo.create(row);
    }
  }
}
