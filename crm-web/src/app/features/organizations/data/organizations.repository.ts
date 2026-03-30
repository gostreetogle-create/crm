import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { OrganizationItem, OrganizationItemInput } from '../model/organization-item';

export interface OrganizationsRepository {
  getItems(): Observable<OrganizationItem[]>;
  create(input: OrganizationItemInput): Observable<OrganizationItem>;
  update(id: string, input: OrganizationItemInput): Observable<OrganizationItem>;
  remove(id: string): Observable<void>;
}

export const ORGANIZATIONS_REPOSITORY = new InjectionToken<OrganizationsRepository>(
  'ORGANIZATIONS_REPOSITORY',
);
