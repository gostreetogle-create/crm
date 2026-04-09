import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

export type SystemNoticeSeverity = 'info' | 'warning' | 'critical';

export type SystemNoticeDto = {
  id: string;
  severity: SystemNoticeSeverity;
  title: string;
  detail: string;
  commands: string[];
  aiPrompt: string;
};

export type SystemStatusDto = {
  db: { ok: boolean; latencyMs?: number; error?: string };
  dbConnection: {
    databaseUrlPresent: boolean;
    protocol: string | null;
    host: string | null;
    port: number | null;
    database: string | null;
    dockerExpectedHostPort: number;
    dockerExpectedContainerPort: number;
  };
  migrations: {
    expectedCount: number;
    appliedCount: number | null;
    pendingNames: string[];
    extraInDbNames: string[];
  };
  notices: SystemNoticeDto[];
  environment: { nodeEnv: string };
};

@Injectable({ providedIn: 'root' })
export class SystemStatusStore {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  readonly status = signal<SystemStatusDto | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly badgeCount = signal(0);

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const base = this.apiConfig.baseUrl.replace(/\/$/, '');
      const res = await firstValueFrom(this.http.get<SystemStatusDto>(`${base}/api/system/status`));
      this.status.set(res);
      this.badgeCount.set(res.notices.filter((x) => x.severity !== 'info').length);
    } catch (e: unknown) {
      this.loadError.set(this.formatLoadError(e));
      this.status.set(null);
      this.badgeCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  formatPendingMigrationNames(names: readonly string[]): string {
    if (names.length === 0) return '';
    if (names.length <= 2) return `${names.join(', ')}.`;
    return `${names.slice(0, 2).join(', ')} и ещё ${names.length - 2}.`;
  }

  dbConnectionSummary(s: SystemStatusDto): string {
    if (!s.dbConnection.databaseUrlPresent) {
      return 'DATABASE_URL не задан';
    }
    const protocol = s.dbConnection.protocol ?? 'postgresql';
    const host = s.dbConnection.host ?? '—';
    const port = s.dbConnection.port ?? 5432;
    const dbName = s.dbConnection.database ?? '—';
    return `${protocol}://${host}:${port}/${dbName}`;
  }

  apiEndpointSummary(): string {
    const base = this.apiConfig.baseUrl.replace(/\/$/, '');
    return `${base}/api`;
  }

  private formatLoadError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error;
      if (body != null && typeof body === 'object' && 'message' in body) {
        const m = (body as { message?: unknown }).message;
        if (typeof m === 'string' && m.trim()) return m;
      }
      if (typeof body === 'string' && body.trim()) return body;
      const fromStatus = [e.status, e.statusText].filter(Boolean).join(' ').trim();
      if (fromStatus) return `Ошибка запроса: ${fromStatus}`;
      return e.message || 'Не удалось загрузить состояние системы';
    }
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return 'Не удалось загрузить состояние системы';
  }
}
