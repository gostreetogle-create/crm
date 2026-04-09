import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import {
  LucideChevronDown,
  LucideCopy,
  LucideEye,
  LucidePencil,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import { FactRow, PageHeaderComponent } from '../page-header/page-header.component';
import { UiModal as UiModalComponent } from '../modal/public-api';
import { UiButtonComponent } from '../ui-button/ui-button.component';
import { UiPaginationComponent } from '../ui-pagination/ui-pagination.component';
import { CrudRowActionsMenuComponent } from './crud-row-actions-menu/crud-row-actions-menu.component';

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
    LucideChevronDown,
    LucideCopy,
    LucideEye,
    LucidePencil,
    LucidePlus,
    LucideTrash2,
    UiModalComponent,
    UiButtonComponent,
    UiPaginationComponent,
    CrudRowActionsMenuComponent,
  ],
  templateUrl: './crud-layout.html',
  styleUrl: './crud-layout.scss',
})
export class CrudLayoutComponent implements OnInit, OnChanges {
  /** `menu` — одна кнопка «⋯» и список действий (компактно, как в CRM). `icons` — прежние отдельные кнопки. */
  @Input() rowActionsLayout: 'icons' | 'menu' = 'icons';

  @Input({ required: true }) columns: TableColumn[] = [];
  @Input({ required: true }) data: CrudTableRow[] = [];
  @Input() toolbarActions: TemplateRef<unknown> | null = null;
  @Input() formActions: TemplateRef<unknown> | null = null;
  /** Кастомный рендер ячейки (row/column/value) для точечных сценариев. */
  @Input() cellTemplate: TemplateRef<{
    row: CrudTableRow;
    column: TableColumn;
    value: unknown;
  }> | null = null;
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
  /**
   * Раскрывающаяся строка под записью: клик по строке (кроме колонки действий) переключает блок.
   * Контент — `expandRowTemplate` с контекстом `{ $implicit: row }`.
   */
  @Input() expandableRows = false;
  @Input() expandRowTemplate: TemplateRef<unknown> | null = null;
  /**
   * Клиентская пагинация по отфильтрованным строкам (после поиска по названию).
   * Как на витрине КП: «На странице» + `app-ui-pagination` справа в тулбаре.
   */
  @Input() tablePagination = false;
  @Input() tablePageSize = 15;
  /** Варианты для селекта «На странице». */
  @Input() tablePageSizeOptions: readonly number[] = [10, 15, 25, 50];
  /** `compact` — минимальные отступы в ячейках (хаб справочников). */
  @Input() tableDensity: 'default' | 'compact' = 'default';
  @Output() view = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  isDeleteConfirmOpen = false;
  private pendingDeleteId: string | null = null;
  nameSearchTerm = '';

  /** Открытая строка меню действий (`null` — закрыто). */
  openRowMenuIndex: number | null = null;

  /** Раскрытая строка таблицы (одна за раз), по `id` записи. */
  expandedRowId: string | null = null;

  /** Текущая страница (1-based) при `tablePagination`. */
  tableCurrentPage = 1;
  /** Эффективный размер страницы (синхронизируется с `tablePageSize`). */
  effectivePageSize = 15;

  ngOnInit(): void {
    this.effectivePageSize = this.tablePageSize;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tablePageSize']) {
      this.effectivePageSize = this.tablePageSize;
      this.tableCurrentPage = 1;
    }
    if (changes['data']) {
      const pc = this.tablePageCount;
      if (this.tableCurrentPage > pc) {
        this.tableCurrentPage = Math.max(1, pc);
      }
    }
  }

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

  get hasRowActions(): boolean {
    return this.showRowActions && (this.canView || this.canDuplicate || this.canEdit || this.canDelete);
  }

  /** Colspan для вложенной строки раскрытия (учёт режима «одна колонка + действия» на хабе). */
  get expandDetailColspan(): number {
    if (this.columns.length === 1 && this.hasRowActions) {
      return 2;
    }
    return this.columns.length + (this.hasRowActions ? 1 : 0);
  }

  rowId(row: CrudTableRow): string {
    const id = row['id'];
    return id != null && id !== '' ? String(id) : '';
  }

  onExpandableRowClick(row: CrudTableRow, ev: MouseEvent): void {
    if (!this.expandableRows || !this.expandRowTemplate) return;
    const t = ev.target as HTMLElement | null;
    if (!t) return;
    if (
      t.closest('td.actionsCol') ||
      t.closest('.crudHubRowActions') ||
      t.closest('.card-actions') ||
      t.closest('[data-crud-row-actions-root]')
    ) {
      return;
    }
    const sid = this.rowId(row);
    if (!sid) return;
    this.expandedRowId = this.expandedRowId === sid ? null : sid;
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

  get tablePageCount(): number {
    const n = this.visibleData.length;
    if (!this.tablePagination || this.effectivePageSize <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(n / this.effectivePageSize));
  }

  /** Страница для `app-ui-pagination` (не выходит за пределы при смене данных / поиска). */
  get clampedTablePage(): number {
    return Math.min(Math.max(1, this.tableCurrentPage), this.tablePageCount);
  }

  /** Строки тела таблицы и мобильных карточек (с учётом maxTableBodyRows и пагинации). */
  get crudTableBodyRows(): CrudTableRow[] {
    const rows = this.visibleData;
    const max = this.maxTableBodyRows;
    if (max != null && Number.isFinite(max) && max >= 0) {
      return rows.slice(0, Math.floor(max));
    }
    if (this.tablePagination && this.effectivePageSize > 0) {
      const page = this.clampedTablePage;
      const start = (page - 1) * this.effectivePageSize;
      return rows.slice(start, start + this.effectivePageSize);
    }
    return rows;
  }

  /**
   * Свернутое превью на хабе (`maxTableBodyRows === 0`): таблицу не рисуем — только сводка.
   * Раньше требовали `visibleData.length > 0`, из‑за чего при пустом списке снова появлялась шапка таблицы
   * и «Нет данных» — визуально не совпадало с плитками, где уже есть записи.
   */
  get isTableRowsHiddenPreview(): boolean {
    return this.maxTableBodyRows === 0;
  }

  /** Эмодзи-иконка для свернутой плитки (быстро понять раздел без таблицы). */
  get previewEmoji(): string {
    const t = this.title.toLowerCase();
    if (t.includes('материал')) return '🧱';
    if (t.includes('характерист')) return '🧪';
    if (t.includes('вид работ')) return '🛠️';
    if (t.includes('единиц')) return '📏';
    if (t.includes('форма') || t.includes('габарит')) return '📐';
    if (t.includes('цвет')) return '🎨';
    if (t.includes('отделк')) return '✨';
    if (t.includes('покрыт')) return '🧴';
    if (t.includes('контакт') || t.includes('клиент')) return '👤';
    if (t.includes('рол')) return '🛡️';
    if (t.includes('пользоват')) return '👥';
    return '📂';
  }

  onNameSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.nameSearchTerm = value;
    this.tableCurrentPage = 1;
  }

  onTablePageChange(page: number): void {
    this.tableCurrentPage = page;
    this.expandedRowId = null;
    this.openRowMenuIndex = null;
  }

  onTablePageSizeChange(event: Event): void {
    const raw = Number((event.target as HTMLSelectElement | null)?.value);
    if (!Number.isFinite(raw) || raw <= 0) {
      return;
    }
    this.effectivePageSize = Math.floor(raw);
    this.tableCurrentPage = 1;
    this.expandedRowId = null;
    this.openRowMenuIndex = null;
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(ev: PointerEvent): void {
    if (this.openRowMenuIndex === null) return;
    const t = ev.target as HTMLElement | null;
    if (t?.closest('[data-crud-row-actions-root]')) return;
    this.closeRowMenu();
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeRowMenu();
  }

  closeRowMenu(): void {
    this.openRowMenuIndex = null;
  }

  toggleRowMenu(event: Event, rowIndex: number): void {
    event.stopPropagation();
    this.openRowMenuIndex = this.openRowMenuIndex === rowIndex ? null : rowIndex;
  }

  onView(row: CrudTableRow): void {
    const id = row['id'];
    if (id == null || id === '') return;
    this.view.emit(String(id));
  }

  onViewAndClose(row: CrudTableRow): void {
    this.closeRowMenu();
    this.onView(row);
  }

  onDuplicateAndClose(row: CrudTableRow): void {
    this.closeRowMenu();
    this.onDuplicate(row);
  }

  onEditAndClose(row: CrudTableRow): void {
    this.closeRowMenu();
    this.onEdit(row);
  }

  onDeleteAndClose(row: CrudTableRow): void {
    this.closeRowMenu();
    this.onDelete(row);
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
