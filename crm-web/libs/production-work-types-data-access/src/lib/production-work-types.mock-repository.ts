import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ProductionWorkTypeItem, ProductionWorkTypeItemInput } from './production-work-type-item';
import { ProductionWorkTypesRepository } from './production-work-types.repository';

function newId(): string {
  return `pwt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: ProductionWorkTypeItem[] = [
  {
    id: newId(),
    name: 'Сварка',
    shortLabel: 'Св.',
    hourlyRateRub: 600,
    isActive: true,
  },
  {
    id: newId(),
    name: 'Покраска',
    shortLabel: 'Покр.',
    hourlyRateRub: 550,
    isActive: true,
  },
  {
    id: newId(),
    name: 'Сборка узла',
    shortLabel: 'Сб.',
    hourlyRateRub: 520,
    isActive: true,
  },
];

@Injectable()
export class ProductionWorkTypesMockRepository implements ProductionWorkTypesRepository {
  private readonly itemsSubject = new BehaviorSubject<ProductionWorkTypeItem[]>(SEED);

  getItems(): Observable<ProductionWorkTypeItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: ProductionWorkTypeItemInput): Observable<ProductionWorkTypeItem> {
    const row: ProductionWorkTypeItem = { id: newId(), ...input };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: ProductionWorkTypeItemInput): Observable<ProductionWorkTypeItem> {
    const row: ProductionWorkTypeItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
