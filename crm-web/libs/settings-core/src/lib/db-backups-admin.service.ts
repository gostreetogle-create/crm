import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

export type DbBackupScheduleDto = {
  enabled: boolean;
  timeHHmm: string;
  lastRunDate: string;
  retentionDays: number;
};

export type DbBackupListItemDto = {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};

export type DbBackupListResponse = {
  items: DbBackupListItemDto[];
  backupDir: string;
};

export type DbBackupCreateResponse = {
  fileName: string;
  sizeBytes: number;
};

export type DbBackupRestoreResponse = {
  ok: true;
  pgToolsSource: string;
  pgToolsHostPort: string;
  prismaPoolRefreshed: boolean;
  prismaPoolRefreshError?: string;
  manualRestartCommand?: string;
  userMessage: string;
};

@Injectable({ providedIn: 'root' })
export class DbBackupsAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(): string {
    const b = this.api.baseUrl.replace(/\/$/, '');
    return `${b}/api/db-backups`;
  }

  getSchedule(): Observable<DbBackupScheduleDto> {
    return this.http.get<DbBackupScheduleDto>(`${this.base()}/schedule`);
  }

  putSchedule(body: {
    enabled: boolean;
    timeHHmm: string;
    retentionDays?: number;
  }): Observable<DbBackupScheduleDto> {
    return this.http.put<DbBackupScheduleDto>(`${this.base()}/schedule`, body);
  }

  list(): Observable<DbBackupListResponse> {
    return this.http.get<DbBackupListResponse>(`${this.base()}`);
  }

  createNow(): Observable<DbBackupCreateResponse> {
    return this.http.post<DbBackupCreateResponse>(`${this.base()}`, {});
  }

  remove(fileName: string): Observable<void> {
    const enc = encodeURIComponent(fileName);
    return this.http.delete<void>(`${this.base()}/${enc}`);
  }

  restore(fileName: string): Observable<DbBackupRestoreResponse> {
    const enc = encodeURIComponent(fileName);
    return this.http.post<DbBackupRestoreResponse>(`${this.base()}/${enc}/restore`, {});
  }

  downloadBlob(fileName: string): Observable<Blob> {
    const enc = encodeURIComponent(fileName);
    return this.http.get(`${this.base()}/${enc}/download`, { responseType: 'blob' });
  }
}
