import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import { ClientItem, ClientItemInput } from './client-item';
import { ClientsRepository } from './clients.repository';

@Injectable()
export class ClientsHttpRepository implements ClientsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/clients${path}`;
  }

  getItems(): Observable<ClientItem[]> {
    return this.http.get<ClientItem[]>(this.endpoint());
  }

  create(input: ClientItemInput): Observable<ClientItem> {
    return this.http.post<ClientItem>(this.endpoint(), input);
  }

  update(id: string, input: ClientItemInput): Observable<ClientItem> {
    return this.http.put<ClientItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
