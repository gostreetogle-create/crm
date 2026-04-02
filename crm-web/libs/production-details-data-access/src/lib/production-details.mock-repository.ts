import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import type { ProductionDetailItem, ProductionDetailItemInput } from './production-detail-item';
import { ProductionDetailsRepository } from './production-details.repository';

function newId(): string {
  return `pd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

@Injectable()
export class ProductionDetailsMockRepository implements ProductionDetailsRepository {
  private readonly itemsSubject = new BehaviorSubject<ProductionDetailItem[]>([]);

  getItems(): Observable<ProductionDetailItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: ProductionDetailItemInput): Observable<ProductionDetailItem> {
    const next: ProductionDetailItem = { id: newId(), ...input };
    this.itemsSubject.next([next, ...this.itemsSubject.value]);
    return of(next);
  }

  update(id: string, input: ProductionDetailItemInput): Observable<ProductionDetailItem> {
    const next: ProductionDetailItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? next : x)));
    return of(next);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(undefined);
  }
}
