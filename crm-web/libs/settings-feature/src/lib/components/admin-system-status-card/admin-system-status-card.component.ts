import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import {
  ContentCardComponent,
  UiButtonComponent,
  UiModal,
} from '@srm/ui-kit';

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
  migrations: {
    expectedCount: number;
    appliedCount: number | null;
    pendingNames: string[];
    extraInDbNames: string[];
  };
  notices: SystemNoticeDto[];
  environment: { nodeEnv: string };
};

@Component({
  selector: 'app-admin-system-status-card',
  standalone: true,
  imports: [ContentCardComponent, UiButtonComponent, UiModal],
  templateUrl: './admin-system-status-card.component.html',
  styleUrl: './admin-system-status-card.component.scss',
})
export class AdminSystemStatusCardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  @ViewChild('modalContentTpl') modalContentTpl!: TemplateRef<unknown>;

  readonly status = signal<SystemStatusDto | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly noticesModalOpen = signal(false);
  readonly copyHint = signal<string | null>(null);

  readonly badgeCount = signal(0);

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const base = this.apiConfig.baseUrl.replace(/\/$/, '');
      const res = await firstValueFrom(
        this.http.get<SystemStatusDto>(`${base}/api/system/status`),
      );
      this.status.set(res);
      const n = res.notices.filter((x) => x.severity !== 'info').length;
      this.badgeCount.set(n);
    } catch (e: unknown) {
      this.loadError.set(this.formatLoadError(e));
      this.status.set(null);
      this.badgeCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  openNotices(): void {
    this.noticesModalOpen.set(true);
  }

  closeNotices(): void {
    this.noticesModalOpen.set(false);
  }

  async copyText(label: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copyHint.set(`Скопировано: ${label}`);
      setTimeout(() => this.copyHint.set(null), 2500);
    } catch {
      this.copyHint.set('Не удалось скопировать — выделите текст вручную');
      setTimeout(() => this.copyHint.set(null), 3500);
    }
  }

  /** HttpErrorResponse не является Error — String(e) давало «[object Object]». */
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

  severityLabel(s: SystemNoticeSeverity): string {
    switch (s) {
      case 'critical':
        return 'Критично';
      case 'warning':
        return 'Внимание';
      default:
        return 'Инфо';
    }
  }

  /** Короткая строка для карточки; полный список — в модалке и в ответе API. */
  formatPendingMigrationNames(names: readonly string[]): string {
    if (names.length === 0) return '';
    if (names.length <= 2) return names.join(', ') + '.';
    return `${names.slice(0, 2).join(', ')} и ещё ${names.length - 2}.`;
  }
}
