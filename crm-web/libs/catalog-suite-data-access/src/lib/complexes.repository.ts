import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { ComplexInput, ComplexItem } from './catalog-suite.models';

export const COMPLEXES_REPOSITORY = new InjectionToken<ComplexesRepository>('COMPLEXES_REPOSITORY');

export interface ComplexesRepository {
  getItems(): Observable<ComplexItem[]>;
  getById(id: string): Observable<ComplexItem>;
  create(input: ComplexInput): Observable<ComplexItem>;
  update(id: string, input: ComplexInput): Observable<ComplexItem>;
  remove(id: string): Observable<void>;
}
