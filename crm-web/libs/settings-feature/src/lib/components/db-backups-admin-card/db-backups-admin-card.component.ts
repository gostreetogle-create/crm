import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ContentCardComponent, UiModal, UiButtonComponent } from '@srm/ui-kit';
import {
  DbBackupListItemDto,
  DbBackupsAdminService,
} from '@srm/settings-core';

@Component({
  selector: 'app-db-backups-admin-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentCardComponent, UiButtonComponent, UiModal],
  templateUrl: './db-backups-admin-card.component.html',
  styleUrl: './db-backups-admin-card.component.scss',
})
export class DbBackupsAdminCardComponent implements OnInit {
  private readonly api = inject(DbBackupsAdminService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly jobBusy = signal(false);
  readonly errorText = signal<string | null>(null);
  /** Сообщение после restore: зелёный баннер при авто‑переподключении Prisma, предупреждение — если нужен ручной перезапуск. */
  readonly restoreFeedbackText = signal<string | null>(null);
  readonly restoreFeedbackIsWarning = signal(false);

  readonly scheduleEnabled = signal(false);
  readonly scheduleTime = signal('03:00');
  readonly lastRunDate = signal('');
  readonly retentionDays = signal(30);

  readonly backupDir = signal('');
  readonly items = signal<DbBackupListItemDto[]>([]);

  readonly deleteTarget = signal<DbBackupListItemDto | null>(null);
  readonly restoreTarget = signal<DbBackupListItemDto | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  /** Текст из ответа API (503 backup_failed) или запасная фраза. */
  private backupCommandErrorMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse)) return fallback;
    const body = err.error;
    if (!body || typeof body !== 'object' || !('message' in body)) return fallback;
    const m = (body as { message: unknown }).message;
    const raw = typeof m === 'string' ? m.trim() : '';
    if (!raw) return fallback;
    return raw.length > 800 ? `${raw.slice(0, 800)}…` : raw;
  }

  reload(): void {
    this.loading.set(true);
    this.errorText.set(null);
    forkJoin({ schedule: this.api.getSchedule(), list: this.api.list() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ schedule: s, list: r }) => {
          this.scheduleEnabled.set(s.enabled);
          this.scheduleTime.set(s.timeHHmm);
          this.lastRunDate.set(s.lastRunDate);
          this.retentionDays.set(s.retentionDays);
          this.items.set(r.items);
          this.backupDir.set(r.backupDir);
        },
        error: () =>
          this.errorText.set('Не удалось загрузить данные бэкапов (расписание или список архивов).'),
      });
  }

  saveSchedule(): void {
    this.saving.set(true);
    this.errorText.set(null);
    this.restoreFeedbackText.set(null);
    this.restoreFeedbackIsWarning.set(false);
    this.api
      .putSchedule({
        enabled: this.scheduleEnabled(),
        timeHHmm: this.scheduleTime(),
        retentionDays: this.retentionDays(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (s) => {
          this.scheduleEnabled.set(s.enabled);
          this.scheduleTime.set(s.timeHHmm);
          this.lastRunDate.set(s.lastRunDate);
          this.retentionDays.set(s.retentionDays);
        },
        error: (err) => {
          if (err?.status === 400) {
            this.errorText.set('Некорректное время (ожидается формат ЧЧ:ММ).');
          } else {
            this.errorText.set('Не удалось сохранить расписание.');
          }
        },
      });
  }

  createNow(): void {
    this.jobBusy.set(true);
    this.errorText.set(null);
    this.restoreFeedbackText.set(null);
    this.restoreFeedbackIsWarning.set(false);
    this.api
      .createNow()
      .pipe(finalize(() => this.jobBusy.set(false)))
      .subscribe({
        next: () => this.reload(),
        error: (err) => {
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.errorText.set('Операция уже выполняется (бэкап или восстановление).');
          } else {
            this.errorText.set(
              this.backupCommandErrorMessage(
                err,
                'Не удалось создать архив. В Docker пересоберите образ backend (в нём должен быть postgresql-client); без Docker — установите postgresql-client на хост.',
              ),
            );
          }
        },
      });
  }

  askDelete(row: DbBackupListItemDto): void {
    this.deleteTarget.set(row);
  }

  closeDeleteModal(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const row = this.deleteTarget();
    if (!row) return;
    this.jobBusy.set(true);
    this.errorText.set(null);
    this.api
      .remove(row.fileName)
      .pipe(finalize(() => this.jobBusy.set(false)))
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.restoreFeedbackText.set(null);
          this.restoreFeedbackIsWarning.set(false);
          this.reload();
        },
        error: () => this.errorText.set('Не удалось удалить архив.'),
      });
  }

  askRestore(row: DbBackupListItemDto): void {
    this.restoreTarget.set(row);
  }

  closeRestoreModal(): void {
    this.restoreTarget.set(null);
  }

  confirmRestore(): void {
    const row = this.restoreTarget();
    if (!row) return;
    this.jobBusy.set(true);
    this.errorText.set(null);
    this.restoreFeedbackText.set(null);
    this.restoreFeedbackIsWarning.set(false);
    this.api
      .restore(row.fileName)
      .pipe(finalize(() => this.jobBusy.set(false)))
      .subscribe({
        next: (r) => {
          this.closeRestoreModal();
          this.restoreFeedbackText.set(r.userMessage);
          this.restoreFeedbackIsWarning.set(!r.prismaPoolRefreshed);
        },
        error: (err) => {
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.errorText.set('Операция уже выполняется.');
          } else {
            this.errorText.set(
              this.backupCommandErrorMessage(err, 'Не удалось восстановить БД из архива.'),
            );
          }
        },
      });
  }

  download(row: DbBackupListItemDto): void {
    this.errorText.set(null);
    this.api.downloadBlob(row.fileName).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = row.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.errorText.set('Не удалось скачать архив.'),
    });
  }

  formatBytes(n: number): string {
    if (n < 1024) return `${n} Б`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} КБ`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} МБ`;
  }
}



