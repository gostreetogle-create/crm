import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UnitItem, UnitItemInput } from '../model/unit-item';
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

  create(input: UnitItemInput): void {
    this.items = [{ id: `u-${Date.now()}`, ...input }, ...this.items];
  }

  update(id: string, input: UnitItemInput): void {
    this.items = this.items.map((x) => (x.id === id ? { ...x, ...input } : x));
  }

  remove(id: string): void {
    this.items = this.items.filter((x) => x.id !== id);
  }
}

