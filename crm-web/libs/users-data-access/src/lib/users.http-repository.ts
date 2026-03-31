import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import { UserItem, UserItemInput } from './user-item';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersHttpRepository implements UsersRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/users${path}`;
  }

  getItems(): Observable<UserItem[]> {
    return this.http.get<UserItem[]>(this.endpoint());
  }

  create(input: UserItemInput): Observable<UserItem> {
    return this.http.post<UserItem>(this.endpoint(), input);
  }

  update(id: string, input: UserItemInput): Observable<UserItem> {
    return this.http.put<UserItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
