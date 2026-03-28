import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MaterialCharacteristicItem, MaterialCharacteristicItemInput } from '../model/material-characteristic-item';
import { MaterialCharacteristicsRepository } from './material-characteristics.repository';

function newId(): string {
  return `mc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: MaterialCharacteristicItem[] = [
  {
    id: newId(),
    name: 'Сталь конструкционная, общий профиль',
    code: 'ST-GEN',
    densityKgM3: 7850,
    notes: 'Пример характеристики без привязки к цвету/покрытию',
    isActive: true,
  },
  {
    id: newId(),
    name: 'Алюминий сплав, анод',
    code: 'AL-ANO',
    densityKgM3: 2700,
    notes: 'Пример под последующую привязку RAL в карточке',
    isActive: true,
  },
];

@Injectable()
export class MaterialCharacteristicsMockRepository implements MaterialCharacteristicsRepository {
  private readonly itemsSubject = new BehaviorSubject<MaterialCharacteristicItem[]>(SEED);

  getItems(): Observable<MaterialCharacteristicItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: MaterialCharacteristicItemInput): void {
    this.itemsSubject.next([{ id: newId(), ...input }, ...this.itemsSubject.value]);
  }

  update(id: string, input: MaterialCharacteristicItemInput): void {
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? { id, ...input } : x)));
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
