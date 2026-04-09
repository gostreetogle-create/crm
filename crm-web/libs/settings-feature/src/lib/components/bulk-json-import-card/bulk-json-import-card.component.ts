import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ContentCardComponent, UiButtonComponent, UiModal } from '@srm/ui-kit';
import { BulkJsonAdminStore } from '../../state/bulk-json-admin.store';

@Component({
  selector: 'app-bulk-json-import-card',
  standalone: true,
  imports: [CommonModule, ContentCardComponent, UiButtonComponent, UiModal],
  templateUrl: './bulk-json-import-card.component.html',
  styleUrl: './bulk-json-import-card.component.scss',
})
export class BulkJsonImportCardComponent {
  private readonly store = inject(BulkJsonAdminStore);

  @ViewChild('jsonFile') private jsonFileInput?: ElementRef<HTMLInputElement>;

  readonly targets = this.store.targets;
  readonly selectedId = this.store.selectedId;
  readonly currentTarget = this.store.currentTarget;
  readonly isPurgeAllConfirmOpen = this.store.isPurgeAllConfirmOpen;
  readonly purgeAllConfirmMessage = this.store.purgeAllConfirmMessage;
  readonly canUseBulkEditor = this.store.canUseBulkEditor;
  readonly canSubmit = this.store.canSubmit;
  readonly canBulkWriteCurrent = this.store.canBulkWriteCurrent;
  readonly canPurgeAll = this.store.canPurgeAll;
  readonly purgeButtonTitle = this.store.purgeButtonTitle;
  readonly canExportFromApi = this.store.canExportFromApi;
  readonly validateDisabledHint = this.store.validateDisabledHint;
  readonly saveDisabledHint = this.store.saveDisabledHint;
  readonly bulkWritePermissionHint = this.store.bulkWritePermissionHint;
  readonly purgeEndpointHint = this.store.purgeEndpointHint;
  readonly loadedFileLabel = this.store.loadedFileLabel;
  readonly statusText = this.store.statusText;
  readonly errorText = this.store.errorText;
  readonly lastResult = this.store.lastResult;
  readonly loading = this.store.loading;
  readonly loadingExport = this.store.loadingExport;
  readonly loadingPurge = this.store.loadingPurge;
  readonly loadingTemplatePreview = this.store.loadingTemplatePreview;
  readonly templatePreviewText = this.store.templatePreviewText;
  readonly uploadedPreviewText = this.store.uploadedPreviewText;
  readonly templatePreviewHint = this.store.templatePreviewHint;
  readonly dbRowsCount = this.store.dbRowsCount;
  readonly validatedOk = this.store.validatedOk;

  constructor() {
    this.store.init();
  }

  onTargetSelect(ev: Event): void {
    this.store.onTargetSelect((ev.target as HTMLSelectElement).value);
  }

  downloadJson(): void {
    this.store.downloadJson();
  }

  openJsonFilePicker(): void {
    this.store.openJsonFilePicker(this.jsonFileInput);
  }

  onJsonFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.store.onJsonFileSelected(file ?? null);
  }

  validate(): void {
    this.store.validate();
  }

  openPurgeAllConfirm(): void {
    this.store.openPurgeAllConfirm();
  }

  cancelPurgeAllConfirm(): void {
    this.store.cancelPurgeAllConfirm();
  }

  confirmPurgeAll(): void {
    this.store.confirmPurgeAll();
  }

  saveToDb(): void {
    this.store.saveToDb();
  }
}
