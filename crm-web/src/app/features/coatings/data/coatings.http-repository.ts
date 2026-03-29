import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';
import { CoatingsRepository } from './coatings.repository';

@Injectable()
export class CoatingsHttpRepository implements CoatingsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/coatings${path}`;
  }

  getItems(): Observable<CoatingItem[]> {
    return this.http.get<CoatingItem[]>(this.endpoint());
  }

  create(input: CoatingItemInput): Observable<CoatingItem> {
    return this.http.post<CoatingItem>(this.endpoint(), input);
  }

  update(id: string, input: CoatingItemInput): Observable<CoatingItem> {
    return this.http.put<CoatingItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
