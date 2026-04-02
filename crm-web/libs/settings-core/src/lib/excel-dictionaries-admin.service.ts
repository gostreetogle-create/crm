import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

export type ExcelSheetReportDto = {
  inputRows: number;
  processedRows: number;
  created: number;
  updated: number;
  skipped: number;
  warnings: Array<{ excelRow: number; field?: string; message: string }>;
  errors: Array<{ excelRow: number; field?: string; message: string }>;
};

export type ExcelDictionariesImportReportDto = {
  ok: boolean;
  totalInputRows: number;
  totalProcessedRows: number;
  sheets: Record<string, ExcelSheetReportDto>;
};

@Injectable({ providedIn: 'root' })
export class ExcelDictionariesAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(): string {
    const configured = this.api.baseUrl.replace(/\/$/, '');
    if (configured) {
      return `${configured}/api/excel-dictionaries`;
    }

    // Если dev-прокси `/api` не настроен/не работает, относительный путь уйдёт в SPA,
    // и вместо xlsx придёт HTML. Для локальной разработки укажем backend напрямую.
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return `http://127.0.0.1:3000/api/excel-dictionaries`;
      }
    }

    return '/api/excel-dictionaries';
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base()}/template`, { responseType: 'blob' });
  }

  downloadExport(): Observable<Blob> {
    return this.http.get(`${this.base()}/export`, { responseType: 'blob' });
  }

  importExcel(file: File): Observable<ExcelDictionariesImportReportDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ExcelDictionariesImportReportDto>(`${this.base()}/import`, fd);
  }
}

