import { InjectionToken } from '@angular/core';

export type AuthzRoleItem = {
  id: string;
  code: string;
  isSystem?: boolean;
};

export interface AuthzRoleContext {
  roleById(roleId: string): AuthzRoleItem | undefined;
}

export const AUTHZ_ROLE_CONTEXT = new InjectionToken<AuthzRoleContext>('AUTHZ_ROLE_CONTEXT', {
  providedIn: 'root',
  factory: () => ({
    roleById: () => undefined,
  }),
});

export type AuthzSystemRoleIds = {
  admin: string;
  editor: string;
  viewer: string;
  director: string;
  accountant: string;
};

export const AUTHZ_SYSTEM_ROLE_IDS = new InjectionToken<AuthzSystemRoleIds>('AUTHZ_SYSTEM_ROLE_IDS', {
  providedIn: 'root',
  factory: () => ({
    admin: 'role-sys-admin',
    editor: 'role-sys-admin',
    viewer: 'role-sys-admin',
    director: 'role-sys-admin',
    accountant: 'role-sys-admin',
  }),
});
