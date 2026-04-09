import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  ContentCardComponent,
  UiButtonComponent,
  UiModal,
} from '@srm/ui-kit';
import { SystemStatusStore, type SystemNoticeSeverity, type SystemStatusDto } from '../../state/system-status.store';

@Component({
  selector: 'app-admin-system-status-card',
  standalone: true,
  imports: [ContentCardComponent, UiButtonComponent, UiModal],
  templateUrl: './admin-system-status-card.component.html',
  styleUrl: './admin-system-status-card.component.scss',
})
export class AdminSystemStatusCardComponent implements OnInit {
  private readonly systemStatusStore = inject(SystemStatusStore);

  @ViewChild('modalContentTpl') modalContentTpl!: TemplateRef<unknown>;

  readonly status = this.systemStatusStore.status;
  readonly loading = this.systemStatusStore.loading;
  readonly loadError = this.systemStatusStore.loadError;
  readonly noticesModalOpen = signal(false);
  readonly copyHint = signal<string | null>(null);
  readonly badgeCount = this.systemStatusStore.badgeCount;

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    await this.systemStatusStore.refresh();
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

  /** Короткая строка для карточки; полный список — в модалке и в ответе API. */
  formatPendingMigrationNames(names: readonly string[]): string {
    return this.systemStatusStore.formatPendingMigrationNames(names);
  }

  dbConnectionSummary(s: SystemStatusDto): string {
    return this.systemStatusStore.dbConnectionSummary(s);
  }

  apiEndpointSummary(): string {
    return this.systemStatusStore.apiEndpointSummary();
  }
}
