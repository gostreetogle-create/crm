import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import {
  LucideCopy,
  LucideDownload,
  LucideEye,
  LucideFileSpreadsheet,
  LucidePencil,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import { FactRow, PageHeaderComponent } from '../page-header/page-header.component';
import { UiModal as UiModalComponent } from '../modal/public-api';
import { UiButtonComponent } from '../ui-button/ui-button.component';

export type TableColumn = {
  key: string;
  label: string;
};

@Component({
  selector: 'crud-layout',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    LucideCopy,
    LucideDownload,
    LucideEye,
    LucideFileSpreadsheet,
    LucidePencil,
    LucideTrash2,
    LucideUpload,
    UiModalComponent,
    UiButtonComponent,
  ],
  templateUrl: './crud-layout.html',
  styleUrl: './crud-layout.scss',
})
export class CrudLayoutComponent {
  @Input({ required: true }) columns: TableColumn[] = [];
  @Input({ required: true }) data: any[] = [];
  @Input() toolbarActions: TemplateRef<unknown> | null = null;
  @Input() formActions: TemplateRef<unknown> | null = null;
  @Input({ required: true }) title!: string;
  @Input() showHeader = true;
  @Input() showCardLabel = false;
  @Input() subtitle = '';
  @Input() facts: FactRow[] = [];
  /** Пока true и строк нет — в таблице показывается «Загрузка…», а не пустой список. */
  @Input() loading = false;
  @Input() showRowActions = true;
  @Input() showCreateAction = false;
  @Input() canCreate = true;
  @Input() createAriaLabel = 'Добавить запись';
  @Input() createTitle = 'Добавить запись';
  @Input() showExcelActions = false;
  @Input() canDownloadTemplate = true;
  @Input() canImportExcel = true;
  @Input() canExportExcel = true;
  @Input() importAccept = '.xlsx,.xls';
  @Input() canView = true;
  @Input() canDuplicate = true;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() showNameSearch = false;
  @Input() nameSearchPlaceholder = 'Поиск по названию...';
  @Input() deleteConfirmTitle = 'Подтвердите удаление';
  @Input() deleteConfirmMessage = 'Удалить запись?';
  @Output() view = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() downloadTemplate = new EventEmitter<void>();
  @Output() importExcel = new EventEmitter<File>();
  @Output() exportExcel = new EventEmitter<void>();
  isDeleteConfirmOpen = false;
  private pendingDeleteId: string | null = null;
  nameSearchTerm = '';

  get hasExcelActions(): boolean {
    return (
      this.showExcelActions &&
      (this.canDownloadTemplate || this.canImportExcel || this.canExportExcel)
    );
  }

  get hasRowActions(): boolean {
    return this.showRowActions && (this.canView || this.canDuplicate || this.canEdit || this.canDelete);
  }

  get visibleData(): any[] {
    if (!this.showNameSearch) {
      return this.data;
    }

    const term = this.nameSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.data;
    }

    return this.data.filter((row) => this.rowMatchesName(row, term));
  }

  onNameSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.nameSearchTerm = value;
  }

  onView(row: any): void {
    if (!row?.id) return;
    this.view.emit(String(row.id));
  }

  onCreate(): void {
    this.create.emit();
  }

  onDuplicate(row: any): void {
    if (!row?.id) return;
    this.duplicate.emit(String(row.id));
  }

  onEdit(row: any): void {
    if (!row?.id) return;
    this.edit.emit(String(row.id));
  }

  onDelete(row: any): void {
    if (!row?.id) return;
    this.pendingDeleteId = String(row.id);
    this.isDeleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return;
    this.delete.emit(this.pendingDeleteId);
    this.cancelDelete();
  }

  onDownloadTemplate(): void {
    this.downloadTemplate.emit();
  }

  onImportPicked(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.importExcel.emit(file);
    if (input) {
      input.value = '';
    }
  }

  onExportExcel(): void {
    this.exportExcel.emit();
  }

  private rowMatchesName(row: any, term: string): boolean {
    if (!row) return false;

    const preferred = [row?.name, row?.title, row?.label];
    const firstColumnValue =
      this.columns.length > 0 ? row?.[this.columns[0].key] : undefined;

    const candidates = [...preferred, firstColumnValue]
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).toLowerCase());

    return candidates.some((v) => v.includes(term));
  }
}
