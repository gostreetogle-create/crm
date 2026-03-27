import { Injectable, computed, signal } from '@angular/core';
import { ROLE_PERMISSIONS } from './authz.matrix';
import { CrudPermissions, PermissionKey, UserRole } from './authz.types';

const STORAGE_KEY = 'crm.currentRole';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly roleSignal = signal<UserRole>(this.readRoleFromStorage());

  readonly role = computed(() => this.roleSignal());
  readonly permissionSet = computed(() => new Set(ROLE_PERMISSIONS[this.roleSignal()]));

  readonly crud = computed<CrudPermissions>(() => {
    const set = this.permissionSet();
    return {
      canCreate: set.has('crud.create'),
      canEdit: set.has('crud.edit'),
      canDelete: set.has('crud.delete'),
      canDuplicate: set.has('crud.duplicate'),
    };
  });

  can(permission: PermissionKey): boolean {
    return this.permissionSet().has(permission);
  }

  hasAny(permissions: ReadonlyArray<PermissionKey>): boolean {
    const set = this.permissionSet();
    return permissions.some((p) => set.has(p));
  }

  setRole(role: UserRole): void {
    this.roleSignal.set(role);
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // no-op for restricted environments
    }
  }

  private readRoleFromStorage(): UserRole {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'admin' || raw === 'editor' || raw === 'viewer') {
        return raw;
      }
    } catch {
      // no-op for restricted environments
    }
    return 'admin';
  }
}
