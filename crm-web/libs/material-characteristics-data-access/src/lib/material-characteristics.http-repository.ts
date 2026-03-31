import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import { MaterialCharacteristicItem, MaterialCharacteristicItemInput } from './material-characteristic-item';
import { MaterialCharacteristicsRepository } from './material-characteristics.repository';

@Injectable()
export class MaterialCharacteristicsHttpRepository implements MaterialCharacteristicsRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/material-characteristics${path}`;
  }

  getItems(): Observable<MaterialCharacteristicItem[]> {
    return this.http.get<MaterialCharacteristicItem[]>(this.endpoint());
  }

  create(input: MaterialCharacteristicItemInput): Observable<MaterialCharacteristicItem> {
    return this.http.post<MaterialCharacteristicItem>(this.endpoint(), input);
  }

  update(id: string, input: MaterialCharacteristicItemInput): Observable<MaterialCharacteristicItem> {
    return this.http.put<MaterialCharacteristicItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
