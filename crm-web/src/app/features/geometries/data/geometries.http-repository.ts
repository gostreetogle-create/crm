import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { GeometryItem, GeometryItemInput } from '../model/geometry-item';
import { GeometriesRepository } from './geometries.repository';

@Injectable()
export class GeometriesHttpRepository implements GeometriesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/geometries${path}`;
  }

  getItems(): Observable<GeometryItem[]> {
    return this.http.get<GeometryItem[]>(this.endpoint());
  }

  create(input: GeometryItemInput): Observable<GeometryItem> {
    return this.http.post<GeometryItem>(this.endpoint(), input);
  }

  update(id: string, input: GeometryItemInput): Observable<GeometryItem> {
    return this.http.put<GeometryItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
