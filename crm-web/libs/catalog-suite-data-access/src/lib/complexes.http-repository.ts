import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { ComplexInput, ComplexItem } from './catalog-suite.models';
import { ComplexesRepository } from './complexes.repository';

@Injectable()
export class ComplexesHttpRepository implements ComplexesRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/complexes${path}`;
  }

  getItems(): Observable<ComplexItem[]> {
    return this.http.get<ComplexItem[]>(this.endpoint());
  }

  getById(id: string): Observable<ComplexItem> {
    return this.http.get<ComplexItem>(this.endpoint(`/${id}`));
  }

  create(input: ComplexInput): Observable<ComplexItem> {
    return this.http.post<ComplexItem>(this.endpoint(), input);
  }

  update(id: string, input: ComplexInput): Observable<ComplexItem> {
    return this.http.put<ComplexItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
