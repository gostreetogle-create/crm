import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

export type SystemNoticeSeverity = 'info' | 'warning' | 'critical';

/** Блок команды для копирования целиком; `label` — подпись сценария. */
export type SystemNoticeCommandDto = {
  label: string;
  snippet: string;
};

export type SystemNoticeDto = {
  id: string;
  severity: SystemNoticeSeverity;
  title: string;
  /** Одна строка: суть */
  summary: string;
  /** Что делать дальше, простым языком */
  nextSteps: string;
  /** Полный текст для шаблона: legacy `detail` с API или summary + nextSteps */
  detail: string;
  commands: SystemNoticeCommandDto[];
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

const defaultDbConnection: SystemStatusDto['dbConnection'] = {
  databaseUrlPresent: false,
  protocol: null,
  host: null,
  port: null,
  database: null,
  dockerExpectedHostPort: 5432,
  dockerExpectedContainerPort: 5432,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readStringOrNull(r: Record<string, unknown>, key: string): string | null {
  const v = r[key];
  if (v === null) return null;
  if (typeof v === 'string') return v;
  return null;
}

function toNoticeCommands(raw: unknown): SystemNoticeCommandDto[] {
  const out: SystemNoticeCommandDto[] = [];
  if (!Array.isArray(raw)) {
    return out;
  }
  for (const item of raw) {
    if (isRecord(item)) {
      const label = item['label'];
      const snippet = item['snippet'];
      if (typeof label === 'string' && typeof snippet === 'string') {
        out.push({ label, snippet });
        continue;
      }
    }
    if (typeof item === 'string' && item.trim()) {
      out.push({ label: 'Команда', snippet: item });
    }
  }
  return out;
}

function normalizeSystemStatusPayload(raw: unknown): SystemStatusDto {
  const o: Record<string, unknown> = isRecord(raw) ? raw : {};

  const dbRaw = o['db'];
  let dbOk: SystemStatusDto['db'];
  if (isRecord(dbRaw)) {
    const okVal = dbRaw['ok'];
    if (typeof okVal === 'boolean') {
      const d = dbRaw;
      const latencyRaw = d['latencyMs'];
      const errorRaw = d['error'];
      dbOk = {
        ok: okVal,
        ...(typeof latencyRaw === 'number' && !Number.isNaN(latencyRaw) ? { latencyMs: latencyRaw } : {}),
        ...(typeof errorRaw === 'string' ? { error: errorRaw } : {}),
      };
    } else {
      dbOk = { ok: false, error: 'Нет данных о БД' };
    }
  } else {
    dbOk = { ok: false, error: 'Нет данных о БД' };
  }

  const dcRaw = o['dbConnection'];
  let dbConnection: SystemStatusDto['dbConnection'];
  if (isRecord(dcRaw) && 'databaseUrlPresent' in dcRaw) {
    const dc = dcRaw;
    const portRaw = dc['port'];
    let port: number | null;
    if (typeof portRaw === 'number' && !Number.isNaN(portRaw)) {
      port = portRaw;
    } else if (portRaw === null) {
      port = null;
    } else {
      port = defaultDbConnection['port'];
    }

    const hostPortRaw = dc['dockerExpectedHostPort'];
    const dockerExpectedHostPort =
      typeof hostPortRaw === 'number' && !Number.isNaN(hostPortRaw)
        ? hostPortRaw
        : defaultDbConnection['dockerExpectedHostPort'];

    const containerPortRaw = dc['dockerExpectedContainerPort'];
    const dockerExpectedContainerPort =
      typeof containerPortRaw === 'number' && !Number.isNaN(containerPortRaw)
        ? containerPortRaw
        : defaultDbConnection['dockerExpectedContainerPort'];

    dbConnection = {
      databaseUrlPresent: Boolean(dc['databaseUrlPresent']),
      protocol: readStringOrNull(dc, 'protocol'),
      host: readStringOrNull(dc, 'host'),
      port,
      database: readStringOrNull(dc, 'database'),
      dockerExpectedHostPort,
      dockerExpectedContainerPort,
    };
  } else {
    dbConnection = defaultDbConnection;
  }

  const migRaw = o['migrations'];
  let migrations: SystemStatusDto['migrations'];
  if (isRecord(migRaw)) {
    const m = migRaw;
    const expectedRaw = m['expectedCount'];
    const expectedCount =
      typeof expectedRaw === 'number' && !Number.isNaN(expectedRaw)
        ? expectedRaw
        : Number(expectedRaw) || 0;

    const appliedRaw = m['appliedCount'];
    const appliedCount: number | null =
      appliedRaw === null || typeof appliedRaw === 'number' ? appliedRaw : null;

    const pendingRaw = m['pendingNames'];
    const pendingNames = Array.isArray(pendingRaw)
      ? pendingRaw.filter((item): item is string => typeof item === 'string')
      : [];

    const extraRaw = m['extraInDbNames'];
    const extraInDbNames = Array.isArray(extraRaw)
      ? extraRaw.filter((item): item is string => typeof item === 'string')
      : [];

    migrations = {
      expectedCount,
      appliedCount,
      pendingNames,
      extraInDbNames,
    };
  } else {
    migrations = {
      expectedCount: 0,
      appliedCount: null,
      pendingNames: [],
      extraInDbNames: [],
    };
  }

  const noticesRaw = o['notices'];
  const notices: SystemNoticeDto[] = Array.isArray(noticesRaw)
    ? noticesRaw
        .map((n): SystemNoticeDto | null => {
          if (!isRecord(n)) return null;
          const x = n;
          if (typeof x['id'] !== 'string' || typeof x['title'] !== 'string') return null;
          const sev = x['severity'];
          const severity: SystemNoticeSeverity =
            sev === 'warning' || sev === 'critical' || sev === 'info' ? sev : 'info';
          const legacyDetail = typeof x['detail'] === 'string' ? x['detail'].trim() : '';
          const summaryStr = typeof x['summary'] === 'string' ? x['summary'].trim() : '';
          const nextStr = typeof x['nextSteps'] === 'string' ? x['nextSteps'].trim() : '';

          const summary = summaryStr || legacyDetail || '';
          const nextSteps = nextStr || (summaryStr && legacyDetail ? legacyDetail : '');

          const commands = toNoticeCommands(x['commands']);

          const detail =
            legacyDetail ||
            [summary, nextSteps]
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
              .join('\n\n');

          const aiRaw = x['aiPrompt'];
          return {
            id: x['id'],
            severity,
            title: x['title'],
            summary,
            nextSteps,
            detail,
            commands,
            aiPrompt: typeof aiRaw === 'string' ? aiRaw : '',
          };
        })
        .filter((x): x is SystemNoticeDto => x != null)
    : [];

  const envRaw = o['environment'];
  let environment: SystemStatusDto['environment'];
  if (isRecord(envRaw) && typeof envRaw['nodeEnv'] === 'string') {
    environment = { nodeEnv: envRaw['nodeEnv'] };
  } else {
    environment = { nodeEnv: 'unknown' };
  }

  return { db: dbOk, dbConnection, migrations, notices, environment };
}

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
      const res = await firstValueFrom(this.http.get<unknown>(`${base}/api/system/status`));
      const normalized = normalizeSystemStatusPayload(res);
      this.status.set(normalized);
      this.badgeCount.set(
        normalized['notices'].filter((row) => row['severity'] !== 'info').length,
      );
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
    const dc = s['dbConnection'] ?? defaultDbConnection;
    if (!dc['databaseUrlPresent']) {
      return 'DATABASE_URL не задан';
    }
    const protocol = dc['protocol'] ?? 'postgresql';
    const host = dc['host'] ?? '—';
    const port = dc['port'] ?? 5432;
    const dbName = dc['database'] ?? '—';
    return `${protocol}://${host}:${port}/${dbName}`;
  }

  apiEndpointSummary(): string {
    const base = this.apiConfig.baseUrl.replace(/\/$/, '');
    return `${base}/api`;
  }

  private formatLoadError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error;
      if (isRecord(body) && 'message' in body) {
        const m = body['message'];
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
