import { HttpClient } from '@angular/common/http';
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
        this.http.get<SystemStatusDto>(`${base}/api/admin/system/status`),
      );
      this.status.set(res);
      const n = res.notices.filter((x) => x.severity !== 'info').length;
      this.badgeCount.set(n);
    } catch (e: unknown) {
      this.loadError.set(e instanceof Error ? e.message : String(e));
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
}
