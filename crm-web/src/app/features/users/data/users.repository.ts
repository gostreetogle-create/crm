import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { UserItem, UserItemInput } from '../model/user-item';

export interface UsersRepository {
  getItems(): Observable<UserItem[]>;
  getSnapshot?(): UserItem[];
  create(input: UserItemInput): void;
  /** Пустой `password` в `input` — сохранить прежний пароль. */
  update(id: string, input: UserItemInput): void;
  remove(id: string): void;
}

export const USERS_REPOSITORY = new InjectionToken<UsersRepository>('USERS_REPOSITORY');
