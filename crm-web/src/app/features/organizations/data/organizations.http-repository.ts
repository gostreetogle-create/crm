import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { OrganizationItem, OrganizationItemInput } from '../model/organization-item';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsHttpRepository implements OrganizationsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/organizations${path}`;
  }

  getItems(): Observable<OrganizationItem[]> {
    return this.http.get<OrganizationItem[]>(this.endpoint());
  }

  create(input: OrganizationItemInput): Observable<OrganizationItem> {
    return this.http.post<OrganizationItem>(this.endpoint(), input);
  }

  update(id: string, input: OrganizationItemInput): Observable<OrganizationItem> {
    return this.http.put<OrganizationItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
