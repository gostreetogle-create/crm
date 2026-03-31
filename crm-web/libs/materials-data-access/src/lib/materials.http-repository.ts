import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { Observable } from 'rxjs';
import type { MaterialItem, MaterialItemInput } from './material-item';
import { MaterialsRepository } from './materials.repository';

@Injectable()
export class MaterialsHttpRepository implements MaterialsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/materials${path}`;
  }

  getItems(): Observable<MaterialItem[]> {
    return this.http.get<MaterialItem[]>(this.endpoint());
  }

  create(input: MaterialItemInput): Observable<MaterialItem> {
    return this.http.post<MaterialItem>(this.endpoint(), input);
  }

  update(id: string, input: MaterialItemInput): Observable<MaterialItem> {
    return this.http.put<MaterialItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
