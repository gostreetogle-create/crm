import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import { RoleItem, RoleItemInput } from './role-item';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesHttpRepository implements RolesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/roles${path}`;
  }

  getItems(): Observable<RoleItem[]> {
    return this.http.get<RoleItem[]>(this.endpoint());
  }

  create(input: RoleItemInput): Observable<RoleItem> {
    return this.http.post<RoleItem>(this.endpoint(), input);
  }

  update(id: string, input: RoleItemInput): Observable<RoleItem> {
    return this.http.put<RoleItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
