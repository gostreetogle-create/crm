import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import type { KpPhotoItem, KpPhotoItemInput } from './kp-photo-item';
import type { KpPhotosRepository } from './kp-photos.repository';

@Injectable()
export class KpPhotosHttpRepository implements KpPhotosRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/kp-photos${path}`;
  }

  getItems(): Observable<KpPhotoItem[]> {
    return this.http.get<KpPhotoItem[]>(this.endpoint());
  }

  create(input: KpPhotoItemInput): Observable<KpPhotoItem> {
    return this.http.post<KpPhotoItem>(this.endpoint(), input);
  }

  update(id: string, input: KpPhotoItemInput): Observable<KpPhotoItem> {
    return this.http.put<KpPhotoItem>(this.endpoint(`/${id}`), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/${id}`));
  }
}
