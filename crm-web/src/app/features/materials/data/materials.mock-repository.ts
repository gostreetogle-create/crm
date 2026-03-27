import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MaterialItem, MaterialItemInput } from '../model/material-item';
import { MaterialsRepository } from './materials.repository';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: MaterialItem[] = [
  {
    id: newId(),
    name: 'Сталь 09Г2С',
    code: 'ST-09G2S',
    densityKgM3: 7850,
    colorName: 'Серый',
    colorHex: '#6B7280',
    finishType: 'Matte',
    roughnessClass: 'Ra 3.2',
    raMicron: 3.2,
    coatingType: 'Powder coating',
    coatingSpec: 'RAL polyester',
    coatingThicknessMicron: 80,
    notes: 'Базовый вариант для корпуса',
    isActive: true,
  },
  {
    id: newId(),
    name: 'Алюминий АМг5',
    code: 'AL-AMG5',
    densityKgM3: 2700,
    colorName: 'Серебристый',
    colorHex: '#C0C0C0',
    finishType: 'Semi-gloss',
    roughnessClass: 'Ra 1.6',
    raMicron: 1.6,
    coatingType: 'Anodizing',
    coatingSpec: 'Clear anodized',
    coatingThicknessMicron: 20,
    notes: 'Легкий материал',
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

