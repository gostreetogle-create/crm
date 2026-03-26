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

type DemoRow = {
  id: string;
  name: string;
  category: string;
  status: string;
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

  hasMainError(controlName: 'name' | 'category'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}

