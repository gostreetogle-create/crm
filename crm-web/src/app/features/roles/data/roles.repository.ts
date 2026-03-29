import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { RoleItem, RoleItemInput } from '../model/role-item';

export interface RolesRepository {
  getItems(): Observable<RoleItem[]>;
  /** Синхронный снимок для авторизации до первого async-load (mock). */
  getSnapshot?(): RoleItem[];
  create(input: RoleItemInput): void;
  update(id: string, input: RoleItemInput): void;
  remove(id: string): void;
}

export const ROLES_REPOSITORY = new InjectionToken<RolesRepository>('ROLES_REPOSITORY');
