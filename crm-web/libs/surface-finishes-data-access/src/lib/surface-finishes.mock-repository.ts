import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { SurfaceFinishItem, SurfaceFinishItemInput } from './surface-finish-item';
import { SurfaceFinishesRepository } from './surface-finishes.repository';
import type { DictionaryPropagationOptions } from '@srm/shared-types';

function newId(): string {
  return `sf-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: SurfaceFinishItem[] = [
  { id: 'sf-seed-glossy', finishType: 'Glossy', roughnessClass: 'Ra 0.4', raMicron: 0.4 },
  { id: 'sf-seed-semi-gloss', finishType: 'Semi-gloss', roughnessClass: 'Ra 1.6', raMicron: 1.6 },
  { id: 'sf-seed-matte', finishType: 'Matte', roughnessClass: 'Ra 3.2', raMicron: 3.2 },
];

@Injectable()
export class SurfaceFinishesMockRepository implements SurfaceFinishesRepository {
  private readonly itemsSubject = new BehaviorSubject<SurfaceFinishItem[]>(SEED);

  getItems(): Observable<SurfaceFinishItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: SurfaceFinishItemInput): Observable<SurfaceFinishItem> {
    const row: SurfaceFinishItem = { id: newId(), ...input };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: SurfaceFinishItemInput, _options?: DictionaryPropagationOptions): Observable<SurfaceFinishItem> {
    const row: SurfaceFinishItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string, _options?: DictionaryPropagationOptions): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
