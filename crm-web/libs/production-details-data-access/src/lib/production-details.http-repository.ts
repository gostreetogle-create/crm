import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { ProductionDetailItem, ProductionDetailItemInput } from './production-detail-item';
import { ProductionDetailsRepository } from './production-details.repository';

@Injectable()
export class ProductionDetailsHttpRepository implements ProductionDetailsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/production-details${path}`;
  }

  getItems(): Observable<ProductionDetailItem[]> {
    return this.http.get<ProductionDetailItem[]>(this.endpoint());
  }

  create(input: ProductionDetailItemInput): Observable<ProductionDetailItem> {
    return this.http.post<ProductionDetailItem>(this.endpoint(), input);
  }

  update(id: string, input: ProductionDetailItemInput): Observable<ProductionDetailItem> {
    return this.http.put<ProductionDetailItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
