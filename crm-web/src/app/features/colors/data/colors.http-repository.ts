import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { ColorItem, ColorItemInput } from '../model/color-item';
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

  update(id: string, input: ColorItemInput): Observable<ColorItem> {
    return this.http.put<ColorItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
