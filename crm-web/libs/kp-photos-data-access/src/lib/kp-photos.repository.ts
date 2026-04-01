import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { KpPhotoItem, KpPhotoItemInput } from './kp-photo-item';

export interface KpPhotosRepository {
  getItems(): Observable<KpPhotoItem[]>;
  create(input: KpPhotoItemInput): Observable<KpPhotoItem>;
  update(id: string, input: KpPhotoItemInput): Observable<KpPhotoItem>;
  remove(id: string): Observable<void>;
}

export const KP_PHOTOS_REPOSITORY = new InjectionToken<KpPhotosRepository>('KP_PHOTOS_REPOSITORY');
