import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { UserItem, UserItemInput } from '../model/user-item';
import { USERS_SEED } from './users.seed';
import { UsersRepository } from './users.repository';

function newId(): string {
  return `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

@Injectable()
export class UsersMockRepository implements UsersRepository {
  private readonly itemsSubject = new BehaviorSubject<UserItem[]>([...USERS_SEED]);

  getItems(): Observable<UserItem[]> {
    return this.itemsSubject.asObservable();
  }

  getSnapshot(): UserItem[] {
    return this.itemsSubject.value;
  }

  create(input: UserItemInput): Observable<UserItem> {
    const next: UserItem = { id: newId(), ...input };
    this.itemsSubject.next([next, ...this.itemsSubject.value]);
    return of(next);
  }

  update(id: string, input: UserItemInput): Observable<UserItem> {
    const password =
      input.password.trim().length > 0
        ? input.password
        : (this.itemsSubject.value.find((x) => x.id === id)?.password ?? input.password);
    const merged: UserItemInput = { ...input, password };
    const row: UserItem = { id, ...merged };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
