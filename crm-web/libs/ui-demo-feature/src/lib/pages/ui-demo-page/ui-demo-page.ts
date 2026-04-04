import { NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideDownload,
  LucidePlus,
  LucideRotateCcw,
  LucideSave,
  LucideShoppingCart,
  LucideStar,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import {
  ContentCardComponent,
  CrudLayoutComponent,
  DictionaryHubTileComponent,
  ProductCardComponent,
  TableColumn,
  UiModal,
  UiButtonComponent,
  UiFormFieldComponent,
  UiPaginationComponent,
  PageShellComponent,
  type FilterOption,
  FiltersBarComponent,
  HubCrudExpandStateService,
  PatternVariantSectionComponent,
  PatternVariantStackComponent,
  UiStateCardComponent,
} from '@srm/ui-kit';
import { PermissionsService } from '@srm/authz-runtime';

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
    LucideDownload,
    LucidePlus,
    LucideRotateCcw,
    LucideSave,
    LucideShoppingCart,
    LucideStar,
    LucideTrash2,
    LucideX,
    PageShellComponent,
    ContentCardComponent,
    DictionaryHubTileComponent,
    PatternVariantStackComponent,
    PatternVariantSectionComponent,
    CrudLayoutComponent,
    FiltersBarComponent,
    UiButtonComponent,
    UiFormFieldComponent,
    UiModal,
    ProductCardComponent,
    UiPaginationComponent,
    UiStateCardComponent,
    RouterLink,
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

  /**
   * Эталон «полной» карточки (вариант 2 на demo): все поля модели строки в таблице, не сжатая плитка хаба.
   */
  readonly standardDictionaryColumns: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Название' },
    { key: 'category', label: 'Категория' },
    { key: 'status', label: 'Статус' },
  ];

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

  /** Данные для эталонной полной таблицы: те же строки, все ключи модели в колонках. */
  readonly standardCrudTableData = computed(() =>
    [...this.rows()]
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        status: r.status,
      })),
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

  /**
   * Эталон паттерна «organization-linked-contacts» (см. карточку на /ui-demo).
   * В продукте: «Контактные лица» в карточке организации.
   */
  readonly linkedContactsDemoOptions = signal<
    { id: string; label: string; phone: string; email: string }[]
  >([
    {
      id: 'demo-c1',
      label: 'Иванов Иван Иванович',
      phone: '+7 900 111-22-33',
      email: 'ivanov@example.test',
    },
    {
      id: 'demo-c2',
      label: 'Петрова Мария Сергеевна',
      phone: '+7 900 222-44-55',
      email: 'petrova@example.test',
    },
    {
      id: 'demo-c3',
      label: 'Сидоров Пётр Алексеевич',
      phone: '+7 900 333-66-77',
      email: 'sidorov@example.test',
    },
  ]);

  readonly linkedContactsDemoForm = this.fb.nonNullable.group({
    contactPicker: [''],
    contactIds: this.fb.nonNullable.control<string[]>([]),
  });

  openQuickAdd(): void {
    this.quickAddOpen.set(true);
    this.quickAddFormSubmitAttempted.set(false);
    this.quickAddForm.reset({ name: '' });
  }

  closeQuickAdd(): void {
    this.quickAddOpen.set(false);
  }

  linkedContactPickerOptions(): { id: string; label: string }[] {
    const selected = new Set(this.linkedContactsDemoForm.controls.contactIds.value ?? []);
    return this.linkedContactsDemoOptions().filter((o) => !selected.has(o.id));
  }

  linkedContactLabel(id: string): string {
    return this.linkedContactsDemoOptions().find((x) => x.id === id)?.label ?? id;
  }

  linkedContactRow(id: string): { fio: string; phone: string; email: string } {
    const o = this.linkedContactsDemoOptions().find((x) => x.id === id);
    if (!o) {
      return { fio: id, phone: '—', email: '—' };
    }
    return { fio: o.label, phone: o.phone, email: o.email };
  }

  addLinkedContactFromPicker(): void {
    const id = this.linkedContactsDemoForm.controls.contactPicker.value?.trim();
    if (!id) {
      return;
    }
    const cur = this.linkedContactsDemoForm.controls.contactIds.value ?? [];
    if (cur.includes(id)) {
      this.linkedContactsDemoForm.controls.contactPicker.setValue('');
      return;
    }
    this.linkedContactsDemoForm.controls.contactIds.setValue([...cur, id]);
    this.linkedContactsDemoForm.controls.contactPicker.setValue('');
    this.lastAction.set(`Демо связей: добавлен «${this.linkedContactLabel(id)}»`);
  }

  removeLinkedContact(id: string): void {
    const cur = this.linkedContactsDemoForm.controls.contactIds.value ?? [];
    this.linkedContactsDemoForm.controls.contactIds.setValue(cur.filter((x) => x !== id));
    this.lastAction.set('Демо связей: строка удалена из списка');
  }

  /** Имитация quick-add в связанный справочник (новая строка в «пуле» опций). */
  demoQuickAddLinkedPerson(): void {
    const n = this.linkedContactsDemoOptions().length + 1;
    const id = `demo-c-${Date.now()}`;
    const label = `Новый контакт ${n} (из демо +)`;
    this.linkedContactsDemoOptions.set([
      ...this.linkedContactsDemoOptions(),
      {
        id,
        label,
        phone: '+7 900 000-00-00',
        email: `demo${n}@example.test`,
      },
    ]);
    this.lastAction.set(`Демо: в пул опций добавлен «${label}»`);
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

  hasMainError(controlName: 'name' | 'category'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}

