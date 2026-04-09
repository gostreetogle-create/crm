import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentCardComponent, UiModal, UiButtonComponent } from '@srm/ui-kit';
import { DbBackupsAdminStore } from '../../state/db-backups-admin.store';
import { DbBackupListItemDto } from '@srm/settings-core';

@Component({
  selector: 'app-db-backups-admin-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentCardComponent, UiButtonComponent, UiModal],
  templateUrl: './db-backups-admin-card.component.html',
  styleUrl: './db-backups-admin-card.component.scss',
})
export class DbBackupsAdminCardComponent implements OnInit {
  private readonly store = inject(DbBackupsAdminStore);

  readonly loading = this.store.loading;
  readonly saving = this.store.saving;
  readonly jobBusy = this.store.jobBusy;
  readonly errorText = this.store.errorText;
  readonly restoreFeedbackText = this.store.restoreFeedbackText;
  readonly restoreFeedbackIsWarning = this.store.restoreFeedbackIsWarning;
  readonly scheduleEnabled = this.store.scheduleEnabled;
  readonly scheduleTime = this.store.scheduleTime;
  readonly lastRunDate = this.store.lastRunDate;
  readonly retentionDays = this.store.retentionDays;
  readonly backupDir = this.store.backupDir;
  readonly items = this.store.items;
  readonly deleteTarget = this.store.deleteTarget;
  readonly restoreTarget = this.store.restoreTarget;

  ngOnInit(): void {
    this.store.reload();
  }

  reload(): void {
    this.store.reload();
  }

  saveSchedule(): void {
    this.store.saveSchedule();
  }

  createNow(): void {
    this.store.createNow();
  }

  askDelete(row: DbBackupListItemDto): void {
    this.store.askDelete(row);
  }

  closeDeleteModal(): void {
    this.store.closeDeleteModal();
  }

  confirmDelete(): void {
    this.store.confirmDelete();
  }

  askRestore(row: DbBackupListItemDto): void {
    this.store.askRestore(row);
  }

  closeRestoreModal(): void {
    this.store.closeRestoreModal();
  }

  confirmRestore(): void {
    this.store.confirmRestore();
  }

  download(row: DbBackupListItemDto): void {
    this.store.download(row);
  }

  formatBytes(n: number): string {
    return this.store.formatBytes(n);
  }
}



