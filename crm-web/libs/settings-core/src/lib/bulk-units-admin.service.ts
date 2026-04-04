import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

export type BulkUnitsImportItem = {
  name: string;
  code?: string;
  notes?: string;
  isActive?: boolean;
};

export type BulkUnitsImportResult = {
  ok: boolean;
  created: Array<{ index: number; id: string }>;
  errors: Array<{ index: number; message: string }>;
};

@Injectable({ providedIn: 'root' })
export class BulkUnitsAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(): string {
    const b = this.api.baseUrl.replace(/\/$/, '');
    return `${b}/api/admin/bulk`;
  }

  importUnits(items: BulkUnitsImportItem[]): Observable<BulkUnitsImportResult> {
    return this.http.post<BulkUnitsImportResult>(`${this.base()}/units`, { items });
  }
}
