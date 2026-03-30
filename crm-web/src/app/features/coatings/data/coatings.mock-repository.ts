import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';
import { CoatingsRepository } from './coatings.repository';
import { DictionaryPropagationOptions } from '../../colors/data/colors.repository';

function newId(): string {
  return `coat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: CoatingItem[] = [
  {
    id: 'coat-seed-powder',
    coatingType: 'Powder coating',
    coatingSpec: 'RAL polyester',
    thicknessMicron: 80,
  },
  {
    id: 'coat-seed-anodizing',
    coatingType: 'Anodizing',
    coatingSpec: 'Clear anodized',
    thicknessMicron: 20,
  },
  {
    id: 'coat-seed-galvanized',
    coatingType: 'Galvanized',
    coatingSpec: 'Zn hot-dip',
    thicknessMicron: 60,
  },
];

@Injectable()
export class CoatingsMockRepository implements CoatingsRepository {
  private readonly itemsSubject = new BehaviorSubject<CoatingItem[]>(SEED);

  getItems(): Observable<CoatingItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: CoatingItemInput): Observable<CoatingItem> {
    const row: CoatingItem = { id: newId(), ...input };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: CoatingItemInput, _options?: DictionaryPropagationOptions): Observable<CoatingItem> {
    const row: CoatingItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string, _options?: DictionaryPropagationOptions): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
