import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RoleItem, RoleItemInput } from '../model/role-item';
import { ROLES_SEED } from './roles.seed';
import { RolesRepository } from './roles.repository';

function newId(): string {
  return `role-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

@Injectable()
export class RolesMockRepository implements RolesRepository {
  private readonly itemsSubject = new BehaviorSubject<RoleItem[]>([...ROLES_SEED]);

  getItems(): Observable<RoleItem[]> {
    return this.itemsSubject.asObservable();
  }

  getSnapshot(): RoleItem[] {
    return this.itemsSubject.value;
  }

  create(input: RoleItemInput): void {
    const next: RoleItem = { id: newId(), ...input };
    this.itemsSubject.next([next, ...this.itemsSubject.value]);
  }

  update(id: string, input: RoleItemInput): void {
    this.itemsSubject.next(
      this.itemsSubject.value.map((x) => (x.id === id ? { id, ...input } : x)),
    );
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
