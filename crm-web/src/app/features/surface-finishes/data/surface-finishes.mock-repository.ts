import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SurfaceFinishItem, SurfaceFinishItemInput } from '../model/surface-finish-item';
import { SurfaceFinishesRepository } from './surface-finishes.repository';

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

  create(input: SurfaceFinishItemInput): void {
    this.itemsSubject.next([{ id: newId(), ...input }, ...this.itemsSubject.value]);
  }

  update(id: string, input: SurfaceFinishItemInput): void {
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? { id, ...input } : x)));
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
