import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';
import { CoatingsRepository } from './coatings.repository';

function newId(): string {
  return `coat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: CoatingItem[] = [
  { id: newId(), coatingType: 'Powder coating', coatingSpec: 'RAL polyester', thicknessMicron: 80 },
  { id: newId(), coatingType: 'Anodizing', coatingSpec: 'Clear anodized', thicknessMicron: 20 },
  { id: newId(), coatingType: 'Galvanized', coatingSpec: 'Zn hot-dip', thicknessMicron: 60 },
];

@Injectable()
export class CoatingsMockRepository implements CoatingsRepository {
  private readonly itemsSubject = new BehaviorSubject<CoatingItem[]>(SEED);

  getItems(): Observable<CoatingItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: CoatingItemInput): void {
    this.itemsSubject.next([{ id: newId(), ...input }, ...this.itemsSubject.value]);
  }

  update(id: string, input: CoatingItemInput): void {
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? { id, ...input } : x)));
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
