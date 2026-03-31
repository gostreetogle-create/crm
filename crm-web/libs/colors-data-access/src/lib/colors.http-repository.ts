import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import type { DictionaryPropagationOptions } from '@srm/shared-types';
import { Observable } from 'rxjs';
import type { ColorItem, ColorItemInput } from './color-item';
import { ColorsRepository } from './colors.repository';

@Injectable()
export class ColorsHttpRepository implements ColorsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/colors${path}`;
  }

  getItems(): Observable<ColorItem[]> {
    return this.http.get<ColorItem[]>(this.endpoint());
  }

  create(input: ColorItemInput): Observable<ColorItem> {
    return this.http.post<ColorItem>(this.endpoint(), input);
  }

  update(id: string, input: ColorItemInput, options?: DictionaryPropagationOptions): Observable<ColorItem> {
    const url = this.endpoint(`/${id}`);
    const propagation = options?.propagation;
    return this.http.put<ColorItem>(
      `${url}${propagation ? `?propagation=${encodeURIComponent(propagation)}` : ''}`,
      input,
    );
  }

  remove(id: string, options?: DictionaryPropagationOptions): Observable<void> {
    const url = this.endpoint(`/${id}`);
    const propagation = options?.propagation;
    return this.http.delete<void>(`${url}${propagation ? `?propagation=${encodeURIComponent(propagation)}` : ''}`);
  }
}
