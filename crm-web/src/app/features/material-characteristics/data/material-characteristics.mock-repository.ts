import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { MaterialCharacteristicItem, MaterialCharacteristicItemInput } from '../model/material-characteristic-item';
import { MaterialCharacteristicsRepository } from './material-characteristics.repository';

function newId(): string {
  return `mc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: MaterialCharacteristicItem[] = [
  {
    id: 'mc-seed-steel-09g2s',
    name: 'Сталь 09Г2С',
    code: 'ST-09G2S',
    densityKgM3: 7850,
    colorId: 'c-seed-gray-custom',
    colorName: 'Серый',
    colorHex: '#6B7280',
    surfaceFinishId: 'sf-seed-matte',
    finishType: 'Matte',
    roughnessClass: 'Ra 3.2',
    raMicron: 3.2,
    coatingId: 'coat-seed-powder',
    coatingType: 'Powder coating',
    coatingSpec: 'RAL polyester',
    coatingThicknessMicron: 80,
    notes: 'Базовый вариант для корпуса',
    isActive: true,
  },
  {
    id: 'mc-seed-al-amg5',
    name: 'Алюминий АМг5',
    code: 'AL-AMG5',
    densityKgM3: 2700,
    colorId: 'c-seed-silver-custom',
    colorName: 'Серебристый',
    colorHex: '#C0C0C0',
    surfaceFinishId: 'sf-seed-semi-gloss',
    finishType: 'Semi-gloss',
    roughnessClass: 'Ra 1.6',
    raMicron: 1.6,
    coatingId: 'coat-seed-anodizing',
    coatingType: 'Anodizing',
    coatingSpec: 'Clear anodized',
    coatingThicknessMicron: 20,
    notes: 'Лёгкий материал',
    isActive: true,
  },
];

@Injectable()
export class MaterialCharacteristicsMockRepository implements MaterialCharacteristicsRepository {
  private readonly itemsSubject = new BehaviorSubject<MaterialCharacteristicItem[]>(SEED);

  getItems(): Observable<MaterialCharacteristicItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: MaterialCharacteristicItemInput): Observable<MaterialCharacteristicItem> {
    const row: MaterialCharacteristicItem = { id: newId(), ...input };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: MaterialCharacteristicItemInput): Observable<MaterialCharacteristicItem> {
    const row: MaterialCharacteristicItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
