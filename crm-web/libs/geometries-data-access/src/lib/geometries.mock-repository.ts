import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { GeometriesRepository } from './geometries.repository';
import { GeometryItem, GeometryItemInput } from './geometry-item';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: GeometryItem[] = [
  {
    id: 'geo-seed-profile-6040',
    name: 'Профиль 60x40x2',
    shapeKey: 'rectangular',
    lengthMm: 3000,
    widthMm: 40,
    heightMm: 60,
    thicknessMm: 2,
    notes: 'Базовый профиль',
    isActive: true,
  },
  {
    id: 'geo-seed-tube-32',
    name: 'Круглая труба 32x2',
    shapeKey: 'tube',
    diameterMm: 32,
    thicknessMm: 2,
    lengthMm: 6000,
    notes: '',
    isActive: true,
  },
];

@Injectable()
export class GeometriesMockRepository implements GeometriesRepository {
  private readonly itemsSubject = new BehaviorSubject<GeometryItem[]>(SEED);

  getItems(): Observable<GeometryItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: GeometryItemInput): Observable<GeometryItem> {
    const next: GeometryItem = { id: newId(), ...input };
    this.itemsSubject.next([next, ...this.itemsSubject.value]);
    return of(next);
  }

  update(id: string, input: GeometryItemInput): Observable<GeometryItem> {
    const row: GeometryItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
