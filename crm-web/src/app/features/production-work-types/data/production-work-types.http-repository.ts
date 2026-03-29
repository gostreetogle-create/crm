import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/api/api-config';
import { ProductionWorkTypeItem, ProductionWorkTypeItemInput } from '../model/production-work-type-item';
import { ProductionWorkTypesRepository } from './production-work-types.repository';

@Injectable()
export class ProductionWorkTypesHttpRepository implements ProductionWorkTypesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/production-work-types${path}`;
  }

  getItems(): Observable<ProductionWorkTypeItem[]> {
    return this.http.get<ProductionWorkTypeItem[]>(this.endpoint());
  }

  create(input: ProductionWorkTypeItemInput): Observable<ProductionWorkTypeItem> {
    return this.http.post<ProductionWorkTypeItem>(this.endpoint(), input);
  }

  update(id: string, input: ProductionWorkTypeItemInput): Observable<ProductionWorkTypeItem> {
    return this.http.put<ProductionWorkTypeItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
