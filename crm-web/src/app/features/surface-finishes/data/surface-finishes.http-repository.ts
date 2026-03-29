import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { SurfaceFinishItem, SurfaceFinishItemInput } from '../model/surface-finish-item';
import { SurfaceFinishesRepository } from './surface-finishes.repository';

@Injectable()
export class SurfaceFinishesHttpRepository implements SurfaceFinishesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/surface-finishes${path}`;
  }

  getItems(): Observable<SurfaceFinishItem[]> {
    return this.http.get<SurfaceFinishItem[]>(this.endpoint());
  }

  create(input: SurfaceFinishItemInput): Observable<SurfaceFinishItem> {
    return this.http.post<SurfaceFinishItem>(this.endpoint(), input);
  }

  update(id: string, input: SurfaceFinishItemInput): Observable<SurfaceFinishItem> {
    return this.http.put<SurfaceFinishItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
