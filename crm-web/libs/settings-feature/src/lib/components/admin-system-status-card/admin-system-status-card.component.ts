import { Component, OnInit, inject, signal } from '@angular/core';
import { ContentCardComponent, UiButtonComponent } from '@srm/ui-kit';
import {
  SystemStatusStore,
  type SystemNoticeDto,
  type SystemNoticeSeverity,
  type SystemStatusDto,
} from '../../state/system-status.store';

@Component({
  selector: 'app-admin-system-status-card',
  standalone: true,
  imports: [ContentCardComponent, UiButtonComponent],
  templateUrl: './admin-system-status-card.component.html',
  styleUrl: './admin-system-status-card.component.scss',
})
export class AdminSystemStatusCardComponent implements OnInit {
  private readonly systemStatusStore = inject(SystemStatusStore);

  readonly status = this.systemStatusStore.status;
  readonly loading = this.systemStatusStore.loading;
  readonly loadError = this.systemStatusStore.loadError;
  readonly copyHint = signal<string | null>(null);
  readonly badgeCount = this.systemStatusStore.badgeCount;

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    await this.systemStatusStore.refresh();
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
        return 'Срочно';
      case 'warning':
        return 'Внимание';
      default:
        return 'Инфо';
    }
  }

  trackNoticeId(_index: number, n: SystemNoticeDto): string {
    return n.id;
  }

  formatPendingMigrationNames(names: readonly string[]): string {
    return this.systemStatusStore.formatPendingMigrationNames(names);
  }

  dbConnectionSummary(s: SystemStatusDto): string {
    return this.systemStatusStore.dbConnectionSummary(s);
  }

  apiEndpointSummary(): string {
    return this.systemStatusStore.apiEndpointSummary();
  }

  healthOverview(s: SystemStatusDto): {
    variant: 'ok' | 'attention' | 'down';
    headline: string;
    sub: string;
  } {
    if (!s.db.ok) {
      return {
        variant: 'down',
        headline: 'База не отвечает',
        sub: 'Запусти Postgres и проверь DATABASE_URL в backend/.env.',
      };
    }
    if (s.migrations.appliedCount === null) {
      return {
        variant: 'down',
        headline: 'База не готова',
        sub: 'Нужно применить миграции — см. карточку ниже.',
      };
    }
    if (s.migrations.pendingNames.length > 0) {
      const n = s.migrations.pendingNames.length;
      return {
        variant: 'attention',
        headline: 'Миграции не совпадают',
        sub:
          n === 1
            ? 'Одно обновление базы не применено — первая команда ниже.'
            : `Не хватает ${n} обновлений базы — начни с первой команды ниже.`,
      };
    }
    if (s.notices.some((x) => x.severity === 'warning')) {
      return {
        variant: 'attention',
        headline: 'Нужно проверить версию',
        sub: 'База и код из разных версий — см. жёлтую карточку.',
      };
    }
    return {
      variant: 'ok',
      headline: 'Всё в порядке',
      sub: 'База на связи, миграции совпадают с кодом.',
    };
  }

  migrationTileLabel(s: SystemStatusDto): string {
    if (s.migrations.appliedCount === null) {
      return 'Неясно';
    }
    if (s.migrations.pendingNames.length > 0) {
      return `Не хватает ${s.migrations.pendingNames.length}`;
    }
    return 'Ок';
  }
}
