import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MaterialItem, MaterialItemInput } from '../model/material-item';
import { MaterialsRepository } from './materials.repository';

function newId(): string {
  return `mat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: MaterialItem[] = [
  {
    id: 'mat-seed-steel-profile',
    name: 'Сталь 09Г2С — профиль 60×40',
    code: 'POS-ST-6040',
    unitId: 'u-3',
    unitName: 'кг (kg)',
    purchasePriceRub: 95,
    materialCharacteristicId: 'mc-seed-steel-09g2s',
    geometryId: 'geo-seed-profile-6040',
    geometryName: 'Профиль 60x40x2',
    notes: 'Складская позиция',
    isActive: true,
  },
  {
    id: 'mat-seed-al-tube',
    name: 'Алюминий АМг5 — труба ⌀32',
    code: 'POS-AL-T32',
    unitId: 'u-3',
    unitName: 'кг (kg)',
    purchasePriceRub: 320,
    materialCharacteristicId: 'mc-seed-al-amg5',
    geometryId: 'geo-seed-tube-32',
    geometryName: 'Круглая труба 32x2',
    notes: 'Складская позиция',
    isActive: true,
  },
];

@Injectable()
export class MaterialsMockRepository implements MaterialsRepository {
  private readonly itemsSubject = new BehaviorSubject<MaterialItem[]>(SEED);

  getItems(): Observable<MaterialItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: MaterialItemInput): void {
    const next: MaterialItem = { id: newId(), ...input };
    this.itemsSubject.next([next, ...this.itemsSubject.value]);
  }

  update(id: string, input: MaterialItemInput): void {
    const updated = this.itemsSubject.value.map((x) => (x.id === id ? { id, ...input } : x));
    this.itemsSubject.next(updated);
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
