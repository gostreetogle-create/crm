import { NgIf } from '@angular/common';
import { Component, TemplateRef, ViewChild, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { confirmDeleteAction } from '../../../../shared/utils/confirm-delete';
import { ProductCardComponent } from '../../../../shared/ui/product-card/public-api';
import { UiPaginationComponent } from '../../../../shared/ui/ui-pagination/ui-pagination.component';

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
    ReactiveFormsModule,
    PageShellComponent,
    ContentCardComponent,
    CrudLayoutComponent,
    FiltersBarComponent,
    UiButtonComponent,
    UiFormFieldComponent,
    UiModal,
    ProductCardComponent,
    UiPaginationComponent,
  ],
  templateUrl: './ui-demo-page.html',
  styleUrl: './ui-demo-page.scss',
})
export class UiDemoPage {
  private readonly fb = new FormBuilder();

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

  readonly columns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'category', label: 'Категория' },
    { key: 'status', label: 'Статус' },
  ];

  readonly rows = signal<DemoRow[]>([
    { id: 'demo-1', name: 'Эталонная запись 1', category: 'Металл', status: 'Черновик' },
    { id: 'demo-2', name: 'Эталонная запись 2', category: 'Полимер', status: 'Активно' },
  ]);

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

  onEdit(id: string): void {
    this.lastAction.set(`Edit: ${id}`);
  }

  onDelete(id: string): void {
    if (!confirmDeleteAction('эту запись')) {
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

