import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import type { KpPhotoItem, KpPhotoItemInput } from './kp-photo-item';
import type { KpPhotosRepository } from './kp-photos.repository';

function newId(): string {
  return `kp-photo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: KpPhotoItem[] = [];

@Injectable()
export class KpPhotosMockRepository implements KpPhotosRepository {
  private readonly itemsSubject = new BehaviorSubject<KpPhotoItem[]>(SEED);

  getItems(): Observable<KpPhotoItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: KpPhotoItemInput): Observable<KpPhotoItem> {
    const row: KpPhotoItem = {
      id: newId(),
      ...input,
      organizationName: input.organizationId ? 'Организация' : '—',
    };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: KpPhotoItemInput): Observable<KpPhotoItem> {
    const row: KpPhotoItem = {
      id,
      ...input,
      organizationName: input.organizationId ? 'Организация' : '—',
    };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
