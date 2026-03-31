import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { UnitItem, UnitItemInput } from './unit-item';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsMockRepository implements UnitsRepository {
  private items: UnitItem[] = [
    { id: 'u-1', name: 'пог. м', code: 'm_run', notes: 'Погонный метр', isActive: true },
    { id: 'u-2', name: 'шт', code: 'pcs', notes: 'Штуки', isActive: true },
    { id: 'u-3', name: 'кг', code: 'kg', notes: 'Килограммы', isActive: true },
  ];

  getItems(): Observable<UnitItem[]> {
    return of(this.items);
  }

  create(input: UnitItemInput): Observable<UnitItem> {
    const created: UnitItem = { id: `u-${Date.now()}`, ...input };
    this.items = [created, ...this.items];
    return of(created);
  }

  update(id: string, input: UnitItemInput): Observable<UnitItem> {
    const current = this.items.find((x) => x.id === id);
    const updated: UnitItem = { ...(current ?? { id }), ...input } as UnitItem;
    this.items = this.items.map((x) => (x.id === id ? updated : x));
    return of(updated);
  }

  remove(id: string): Observable<void> {
    this.items = this.items.filter((x) => x.id !== id);
    return of(void 0);
  }
}
