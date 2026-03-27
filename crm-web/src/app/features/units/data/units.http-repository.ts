import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { UnitItem, UnitItemInput } from '../model/unit-item';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsHttpRepository implements UnitsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    return `${this.api.baseUrl}/units${path}`;
  }

  getItems(): Observable<UnitItem[]> {
    return this.http.get<UnitItem[]>(this.endpoint());
  }

  create(input: UnitItemInput): Observable<UnitItem> {
    return this.http.post<UnitItem>(this.endpoint(), input);
  }

  update(id: string, input: UnitItemInput): Observable<UnitItem> {
    return this.http.put<UnitItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
