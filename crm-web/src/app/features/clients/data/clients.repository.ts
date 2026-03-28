import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientItem, ClientItemInput } from '../model/client-item';

export interface ClientsRepository {
  getItems(): Observable<ClientItem[]>;
  create(input: ClientItemInput): void;
  update(id: string, input: ClientItemInput): void;
  remove(id: string): void;
}

export const CLIENTS_REPOSITORY = new InjectionToken<ClientsRepository>('CLIENTS_REPOSITORY');
