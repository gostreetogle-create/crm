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
  /** Ключ поля с HEX (#rrggbb) — мини-образец слева от текста (как в модалке «RAL и название»). */
  swatchHexKey?: string;
};

/** Строка таблицы CRUD: ожидается поле `id`; остальные ключи — по колонкам и полям поиска. */
export type CrudTableRow = Record<string, unknown>;

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
  @Input({ required: true }) data: CrudTableRow[] = [];
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
  /** Карточки (узкая ширина): в `auto` при более чем 5 колонках — две колонки полей. */
  @Input() cardFieldsLayout: 'auto' | 'single' | 'double' = 'auto';
  @Input() deleteConfirmTitle = 'Подтвердите удаление';
  @Input() deleteConfirmMessage = 'Удалить запись?';
  /**
   * Ограничить число строк в таблице (после поиска). `null` — все строки.
   * Для компактного превью на demo / узких витрин.
   */
  @Input() maxTableBodyRows: number | null = null;
  /** CSS max-height для блока таблицы (например `min(72vh, 34rem)`), с вертикальным скроллом. */
  @Input() tableBodyMaxHeight: string | null = null;
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

  /** Безопасный фон для квадрата-образца (только #RGB / #RRGGBB). */
  swatchBackground(row: Record<string, unknown> | null | undefined, hexKey: string | undefined): string {
    if (!row || !hexKey) {
      return 'transparent';
    }
    const v = row[hexKey];
    if (typeof v !== 'string') {
      return 'transparent';
    }
    const s = v.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : 'transparent';
  }

  get hasExcelActions(): boolean {
    return (
      this.showExcelActions &&
      (this.canDownloadTemplate || this.canImportExcel || this.canExportExcel)
    );
  }

  get hasRowActions(): boolean {
    return this.showRowActions && (this.canView || this.canDuplicate || this.canEdit || this.canDelete);
  }

  get cardFieldsAreDoubleColumn(): boolean {
    if (this.cardFieldsLayout === 'double') return true;
    if (this.cardFieldsLayout === 'single') return false;
    return this.columns.length > 5;
  }

  get visibleData(): CrudTableRow[] {
    if (!this.showNameSearch) {
      return this.data;
    }

    const term = this.nameSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.data;
    }

    return this.data.filter((row) => this.rowMatchesName(row, term));
  }

  /** Строки тела таблицы и мобильных карточек (с учётом maxTableBodyRows). */
  get crudTableBodyRows(): CrudTableRow[] {
    const rows = this.visibleData;
    const max = this.maxTableBodyRows;
    if (max != null && Number.isFinite(max) && max >= 0) {
      return rows.slice(0, Math.floor(max));
    }
    return rows;
  }

  onNameSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.nameSearchTerm = value;
  }

  onView(row: CrudTableRow): void {
    const id = row['id'];
    if (id == null || id === '') return;
    this.view.emit(String(id));
  }

  onCreate(): void {
    this.create.emit();
  }

  onDuplicate(row: CrudTableRow): void {
    const id = row['id'];
    if (id == null || id === '') return;
    this.duplicate.emit(String(id));
  }

  onEdit(row: CrudTableRow): void {
    const id = row['id'];
    if (id == null || id === '') return;
    this.edit.emit(String(id));
  }

  onDelete(row: CrudTableRow): void {
    const id = row['id'];
    if (id == null || id === '') return;
    this.pendingDeleteId = String(id);
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

  private rowMatchesName(row: CrudTableRow, term: string): boolean {
    const preferred = [row['name'], row['title'], row['label'], row['hubLine']];
    const firstColumnValue =
      this.columns.length > 0 ? row[this.columns[0].key] : undefined;

    const candidates = [...preferred, firstColumnValue]
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).toLowerCase());

    return candidates.some((v) => v.includes(term));
  }
}
