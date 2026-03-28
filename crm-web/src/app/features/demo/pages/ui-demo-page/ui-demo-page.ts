import { NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideCheck,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideDownload,
  LucideInbox,
  LucideLoader2,
  LucidePlus,
  LucideRotateCcw,
  LucideSave,
  LucideShoppingCart,
  LucideStar,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { CrudLayoutComponent, TableColumn } from '../../../../shared/ui/crud-layout/public-api';
import {
  FilterOption,
  FiltersBarComponent,
} from '../../../../shared/ui/filters-bar/filters-bar.component';
import { UiModal } from '../../../../shared/ui/modal/public-api';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import { ProductCardComponent } from '../../../../shared/ui/product-card/public-api';
import { UiPaginationComponent } from '../../../../shared/ui/ui-pagination/ui-pagination.component';
import { PermissionsService, UserRole } from '../../../../core/auth/public-api';
import {
  HubCrudExpandStateService,
  HubCrudExpandableShellComponent,
} from '../../../../shared/ui/hub-crud-expandable/public-api';

type DemoRow = {
  id: string;
  name: string;
  category: string;
  status: string;
};

type DemoProduct = {
  id: string;
  category: string;
  title: string;
  sku: string;
  price: number;
  imageSeed: string;
};

@Component({
  selector: 'app-ui-demo-page',
  standalone: true,
  imports: [
    NgIf,
    NgTemplateOutlet,
    ReactiveFormsModule,
    LucideCheck,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideDownload,
    LucideInbox,
    LucideLoader2,
    LucidePlus,
    LucideRotateCcw,
    LucideSave,
    LucideShoppingCart,
    LucideStar,
    LucideTrash2,
    LucideX,
    PageShellComponent,
    ContentCardComponent,
    CrudLayoutComponent,
    FiltersBarComponent,
    UiButtonComponent,
    UiFormFieldComponent,
    UiModal,
    ProductCardComponent,
    UiPaginationComponent,
    HubCrudExpandableShellComponent,
  ],
  templateUrl: './ui-demo-page.html',
  styleUrl: './ui-demo-page.scss',
})
export class UiDemoPage {
  private readonly fb = new FormBuilder();
  readonly permissions = inject(PermissionsService);
  readonly hubExpand = inject(HubCrudExpandStateService);

  /** Контексты для ng-template демо-таблицы (полный список / превью одной строки). */
  readonly dictionaryCrudDemoContexts = {
    full: { maxRows: null as number | null, maxHeight: null as string | null },
    previewOneRow: { maxRows: 1 as number | null, maxHeight: null as string | null },
  };

  @ViewChild('quickAddContent') quickAddContent?: TemplateRef<unknown>;
  @ViewChild('quickAddActions') quickAddActions?: TemplateRef<unknown>;

  readonly categoryOptions = signal<string[]>(['Металл', 'Полимер', 'Композит']);
  readonly quickAddOpen = signal(false);
  readonly quickAddFormSubmitAttempted = signal(false);
  readonly lastAction = signal('Нет действий');
  readonly demoExcelStatus = signal('');
  readonly searchTerm = signal('');
  readonly sortBy = signal<'name' | 'category' | 'status'>('name');
  readonly filterCategory = signal<'all' | string>('all');

  // Showcase (products)
  readonly productSearch = signal('');
  readonly productSort = signal<'priceDesc' | 'priceAsc'>('priceDesc');
  readonly productCategory = signal<'all' | string>('all');
  readonly productPage = signal(1);
  readonly productPageSize = 8;

  readonly products = signal<DemoProduct[]>([
    {
      id: 'p-1501',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Подтягивание «STREET IRON»',
      sku: 'УТ1501',
      price: 125_000,
      imageSeed: 'ut1501',
    },
    {
      id: 'p-1502',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Жим от плеч «STREET IRON»',
      sku: 'УТ1502',
      price: 125_000,
      imageSeed: 'ut1502',
    },
    {
      id: 'p-1503',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Тяга на себя «STREET IRON»',
      sku: 'УТ1503',
      price: 120_000,
      imageSeed: 'ut1503',
    },
    {
      id: 'p-1504',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Брусья/жим «STREET IRON»',
      sku: 'УТ1504',
      price: 119_000,
      imageSeed: 'ut1504',
    },
    {
      id: 'p-1601',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Гиперэкстензия «STREET IRON»',
      sku: 'УТ1601',
      price: 132_000,
      imageSeed: 'ut1601',
    },
    {
      id: 'p-1602',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Гребная тяга «STREET IRON»',
      sku: 'УТ1602',
      price: 128_000,
      imageSeed: 'ut1602',
    },
    {
      id: 'p-1701',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Присед «STREET IRON»',
      sku: 'УТ1701',
      price: 109_000,
      imageSeed: 'ut1701',
    },
    {
      id: 'p-1702',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Жим ногами «STREET IRON»',
      sku: 'УТ1702',
      price: 141_000,
      imageSeed: 'ut1702',
    },
    {
      id: 'p-1801',
      category: 'Уличные тренажёры «STREET IRON»',
      title: 'Уличный тренажёр — Степпер «STREET IRON»',
      sku: 'УТ1801',
      price: 98_000,
      imageSeed: 'ut1801',
    },
  ]);

  readonly productCategoryOptions = computed<FilterOption[]>(() => {
    const categories = Array.from(new Set(this.products().map((p) => p.category))).sort((a, b) =>
      a.localeCompare(b),
    );
    return [{ value: 'all', label: 'Категория: все' }].concat(
      categories.map((c) => ({ value: c, label: `Категория: ${c}` })),
    );
  });

  readonly productSortOptions: FilterOption[] = [
    { value: 'priceDesc', label: 'Сортировка: цена ↓' },
    { value: 'priceAsc', label: 'Сортировка: цена ↑' },
  ];

  readonly filteredProducts = computed(() => {
    const term = this.productSearch().trim().toLowerCase();
    const category = this.productCategory();
    const sort = this.productSort();

    const items = this.products()
      .filter((p) => (category === 'all' ? true : p.category === category))
      .filter((p) => {
        if (!term) return true;
        return (
          p.title.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sort === 'priceAsc') return a.price - b.price;
        return b.price - a.price;
      });

    return items;
  });

  readonly productPageCount = computed(() => {
    return Math.max(1, Math.ceil(this.filteredProducts().length / this.productPageSize));
  });

  readonly visibleProducts = computed(() => {
    const totalPages = this.productPageCount();
    const current = Math.min(Math.max(1, this.productPage()), totalPages);
    const start = (current - 1) * this.productPageSize;
    return this.filteredProducts().slice(start, start + this.productPageSize);
  });

  /** Как на хабе `/dictionaries`: одна колонка «Запись» (hubLine); детали — в модалке. */
  readonly columns: TableColumn[] = [{ key: 'hubLine', label: 'Строка' }];

  readonly rows = signal<DemoRow[]>([
    { id: 'demo-1', name: 'Эталонная запись 1', category: 'Металл', status: 'Черновик' },
    { id: 'demo-2', name: 'Эталонная запись 2', category: 'Полимер', status: 'Активно' },
    { id: 'demo-3', name: 'Эталонная запись 3', category: 'Композит', status: 'Активно' },
    { id: 'demo-4', name: 'Эталонная запись 4', category: 'Металл', status: 'Архив' },
  ]);
  readonly universalCrudData = computed(() =>
    [...this.rows()]
      .map((r) => ({
        id: r.id,
        name: r.name,
        hubLine: `${r.name} · ${r.category} · ${r.status}`,
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name))),
  );

  readonly demoData = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const categoryFilter = this.filterCategory();
    const sorted = [...this.rows()]
      .filter((row) => {
        if (categoryFilter !== 'all' && row.category !== categoryFilter) {
          return false;
        }
        if (!term) return true;
        return (
          row.name.toLowerCase().includes(term) ||
          row.category.toLowerCase().includes(term) ||
          row.status.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const key = this.sortBy();
        return String(a[key]).localeCompare(String(b[key]));
      });
    return sorted;
  });

  readonly sortOptions: FilterOption[] = [
    { value: 'name', label: 'Сортировка: name' },
    { value: 'category', label: 'Сортировка: category' },
    { value: 'status', label: 'Сортировка: status' },
  ];

  readonly filterOptions = computed<FilterOption[]>(() => [
    { value: 'all', label: 'Категория: все' },
    ...this.categoryOptions().map((option) => ({
      value: option,
      label: `Категория: ${option}`,
    })),
  ]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['Металл', Validators.required],
  });

  readonly quickAddForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly roleOptions: ReadonlyArray<{ value: UserRole; label: string }> = [
    { value: 'admin', label: 'admin (create/edit/delete)' },
    { value: 'editor', label: 'editor (create/edit)' },
    { value: 'viewer', label: 'viewer (read only)' },
  ];

  openQuickAdd(): void {
    this.quickAddOpen.set(true);
    this.quickAddFormSubmitAttempted.set(false);
    this.quickAddForm.reset({ name: '' });
  }

  closeQuickAdd(): void {
    this.quickAddOpen.set(false);
  }

  confirmQuickAdd(): void {
    if (this.quickAddForm.invalid) {
      this.quickAddFormSubmitAttempted.set(true);
      this.quickAddForm.markAllAsTouched();
      return;
    }

    const nextCategory = this.quickAddForm.controls.name.value.trim();
    const current = this.categoryOptions();
    if (!current.includes(nextCategory)) {
      this.categoryOptions.set([...current, nextCategory]);
    }
    this.form.controls.category.setValue(nextCategory);
    this.lastAction.set(`Добавлена категория: ${nextCategory}`);
    this.quickAddOpen.set(false);
  }

  submitMainForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const next: DemoRow = {
      id: `demo-${Date.now()}`,
      name: this.form.controls.name.value.trim(),
      category: this.form.controls.category.value,
      status: 'Черновик',
    };
    this.rows.set([next, ...this.rows()]);
    this.lastAction.set(`Создана запись: ${next.name}`);
    this.form.reset({ name: '', category: this.form.controls.category.value });
  }

  addUniversalDemoRow(): void {
    if (!this.permissions.can('crud.create')) {
      return;
    }
    const next: DemoRow = {
      id: `demo-${Date.now()}`,
      name: `Строка из демо ${this.rows().length + 1}`,
      category: 'Металл',
      status: 'Черновик',
    };
    this.rows.set([next, ...this.rows()]);
    this.lastAction.set(`Добавлена строка: ${next.name}`);
  }

  onEdit(id: string): void {
    if (!this.permissions.can('crud.edit')) {
      return;
    }
    this.lastAction.set(`Edit: ${id}`);
  }

  onView(id: string): void {
    this.lastAction.set(`View: ${id}`);
  }

  onDuplicate(id: string): void {
    if (!this.permissions.can('crud.duplicate')) {
      return;
    }
    const item = this.rows().find((x) => x.id === id);
    if (!item) return;
    const next: DemoRow = {
      id: `demo-${Date.now()}`,
      name: `${item.name} (копия)`,
      category: item.category,
      status: 'Черновик',
    };
    this.rows.set([next, ...this.rows()]);
    this.lastAction.set(`Duplicate: ${id}`);
  }

  onDelete(id: string): void {
    if (!this.permissions.can('crud.delete')) {
      return;
    }
    this.rows.set(this.rows().filter((x) => x.id !== id));
    this.lastAction.set(`Delete: ${id}`);
  }

  async downloadDemoTemplateExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'demo-crud-template.xlsx',
      'DEMO_TEMPLATE',
      [
        { Название: 'Эталонная запись 1', Категория: 'Металл', Статус: 'Черновик' },
        { Название: 'Эталонная запись 2', Категория: 'Полимер', Статус: 'Активно' },
      ],
      ['Название', 'Категория', 'Статус'],
    );
    this.demoExcelStatus.set('Шаблон Excel скачан.');
  }

  async exportDemoExcel(): Promise<void> {
    const rows = this.rows().map((x) => ({
      Название: x.name,
      Категория: x.category,
      Статус: x.status,
    }));
    await this.exportRowsToExcel('demo-crud.xlsx', 'DEMO', rows, ['Название', 'Категория', 'Статус']);
    this.demoExcelStatus.set(`Экспортировано: ${rows.length} строк.`);
  }

  async onDemoExcelImported(file: File): Promise<void> {
    try {
      const rawRows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapDemoRows(rawRows);
      if (!parsed.ok) {
        this.demoExcelStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      const importedRows = parsed.rows.map((row) => ({ ...row, id: `demo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}` }));
      this.rows.set([...importedRows, ...this.rows()]);
      this.demoExcelStatus.set(`Импортировано: ${importedRows.length} строк.`);
      this.lastAction.set(`Demo Excel import: ${importedRows.length}`);
    } catch {
      this.demoExcelStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  onSortChange(value: string): void {
    if (value === 'name' || value === 'category' || value === 'status') {
      this.sortBy.set(value);
    }
  }

  onFilterCategory(value: string): void {
    this.filterCategory.set(value || 'all');
  }

  onProductSearch(value: string): void {
    this.productSearch.set(value);
    this.productPage.set(1);
  }

  onProductSortChange(value: string): void {
    if (value === 'priceAsc' || value === 'priceDesc') {
      this.productSort.set(value);
      this.productPage.set(1);
    }
  }

  onProductCategory(value: string): void {
    this.productCategory.set(value || 'all');
    this.productPage.set(1);
  }

  onProductPageChange(page: number): void {
    this.productPage.set(page);
  }

  onRoleChange(value: string): void {
    if (value === 'admin' || value === 'editor' || value === 'viewer') {
      this.permissions.setRole(value);
      this.lastAction.set(`Роль: ${value}`);
    }
  }

  hasMainError(controlName: 'name' | 'category'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private async exportRowsToExcel(
    filename: string,
    sheetName: string,
    rows: Array<Record<string, string | number>>,
    headers: string[],
  ): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  }

  private async excelRowsFromFile(file: File): Promise<Array<Record<string, unknown>>> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }

  private validateAndMapDemoRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<Omit<DemoRow, 'id'>>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<Omit<DemoRow, 'id'>> = [];
    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Название', 'Категория', 'Статус'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const category = String(row['Категория'] ?? '').trim();
      const status = String(row['Статус'] ?? '').trim();
      if (!name || !category || !status) {
        errors.push(`Строка ${rowNo}: заполните Название/Категория/Статус.`);
        return;
      }
      mapped.push({ name, category, status });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }
}

