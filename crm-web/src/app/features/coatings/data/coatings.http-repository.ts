import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';
import { CoatingsRepository } from './coatings.repository';
import { DictionaryPropagationOptions } from '../../colors/data/colors.repository';

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

  update(id: string, input: CoatingItemInput, options?: DictionaryPropagationOptions): Observable<CoatingItem> {
    const url = this.endpoint(`/${id}`);
    const propagation = options?.propagation;
    return this.http.put<CoatingItem>(`${url}${propagation ? `?propagation=${encodeURIComponent(propagation)}` : ''}`, input);
  }

  remove(id: string, options?: DictionaryPropagationOptions): Observable<void> {
    const url = this.endpoint(`/${id}`);
    const propagation = options?.propagation;
    return this.http.delete<void>(`${url}${propagation ? `?propagation=${encodeURIComponent(propagation)}` : ''}`);
  }
}
