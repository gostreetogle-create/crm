import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientItem, ClientItemInput } from '../model/client-item';

export interface ClientsRepository {
  getItems(): Observable<ClientItem[]>;
  create(input: ClientItemInput): Observable<ClientItem>;
  update(id: string, input: ClientItemInput): Observable<ClientItem>;
  remove(id: string): Observable<void>;
}

export const CLIENTS_REPOSITORY = new InjectionToken<ClientsRepository>('CLIENTS_REPOSITORY');
