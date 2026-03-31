import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { UserItem, UserItemInput } from './user-item';

export interface UsersRepository {
  getItems(): Observable<UserItem[]>;
  getSnapshot?(): UserItem[];
  create(input: UserItemInput): Observable<UserItem>;
  /** Пустой `password` в `input` — сохранить прежний пароль. */
  update(id: string, input: UserItemInput): Observable<UserItem>;
  remove(id: string): Observable<void>;
}

export const USERS_REPOSITORY = new InjectionToken<UsersRepository>('USERS_REPOSITORY');
