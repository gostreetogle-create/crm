import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

/** Ответ bulk POST (единый формат для справочников). */
export type BulkJsonImportResult = {
  ok: boolean;
  created: Array<{ index: number; id: string }>;
  errors: Array<{ index: number; message: string }>;
};

/** Ответ DELETE /api/bulk/:segment/all при успехе. */
export type BulkJsonPurgeResult = {
  ok: true;
  deleted: number;
};

@Injectable({ providedIn: 'root' })
export class BulkJsonAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(): string {
    const b = this.api.baseUrl.replace(/\/$/, '');
    return `${b}/api/bulk`;
  }

  /** POST /api/bulk/:segment с телом { items }. */
  importBulk(segment: string, items: unknown[]): Observable<BulkJsonImportResult> {
    const path = segment.replace(/^\/+|\/+$/g, '');
    return this.http.post<BulkJsonImportResult>(`${this.base()}/${path}`, { items });
  }

  /** GET /api/bulk/:segment/export — полный снимок в формате { items } для массового импорта. */
  exportBulk(segment: string): Observable<{ items: unknown[] }> {
    const path = segment.replace(/^\/+|\/+$/g, '');
    return this.http.get<{ items: unknown[] }>(`${this.base()}/${path}/export`);
  }

  /** DELETE /api/bulk/:segment/all — удаление всех строк таблицы (те же права, что у POST). */
  purgeBulkAll(segment: string): Observable<BulkJsonPurgeResult> {
    const path = segment.replace(/^\/+|\/+$/g, '');
    return this.http.delete<BulkJsonPurgeResult>(`${this.base()}/${path}/all`);
  }
}
