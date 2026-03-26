import { NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import {
  CrudLayoutComponent,
  TableColumn,
} from 'src/app/shared/ui/crud-layout/public-api';
import { UiModal as UiModalComponent } from 'src/app/shared/ui/modal/public-api';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiCheckboxFieldComponent } from '../../../../shared/ui/ui-checkbox-field/ui-checkbox-field.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import { confirmDeleteAction } from '../../../../shared/utils/confirm-delete';
import { MaterialsStore } from '../../state/materials.store';

@Component({
  selector: 'app-materials-crud-page',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    PageShellComponent,
    CrudLayoutComponent,
    ContentCardComponent,
    UiModalComponent,
    UiButtonComponent,
    UiCheckboxFieldComponent,
    UiFormFieldComponent,
  ],
  templateUrl: './materials-crud-page.html',
  styleUrl: './materials-crud-page.scss',
})
export class MaterialsCrudPage {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(MaterialsStore);
  readonly isEditDialogOpen = signal(false);

  readonly materialColumns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'densityKgM3', label: 'Плотность' },
    { key: 'color', label: 'Цвет' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly vm = computed(() => ({
    materialsData: this.store['materialsData'](),
    facts: this.store['facts'](),
    isEditMode: this.store['isEditMode'](),
    editId: this.store['editId'](),
    formSubmitAttempted: this.store['formSubmitAttempted'](),
  }));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    densityKgM3: [null as number | null],
    colorName: [''],
    colorHex: [''],
    notes: [''],
    isActive: [true],
  });

  constructor() {
    this.store['loadItems']();
  }

  startCreate(): void {
    this.isEditDialogOpen.set(false);
    this.store['startCreate']();
    this.form.reset({
      name: '',
      code: '',
      densityKgM3: null,
      colorName: '',
      colorHex: '',
      notes: '',
      isActive: true,
    });
  }

  startEdit(id: string): void {
    const item = this.store['items']().find((x) => x.id === id);
    if (!item) return;
    this.isEditDialogOpen.set(true);
    this.store['startEdit'](item.id);
    this.form.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
  }

  submitCreate(): void {
    if (this.form.invalid) {
      this.store['submit']({ value: this.buildPayload(), isValid: false });
      this.form.markAllAsTouched();
      return;
    }

    this.store['submit']({ value: this.buildPayload(), isValid: true });
  }

  submitEdit(): void {
    if (this.form.invalid) {
      this.store['submit']({ value: this.buildPayload(), isValid: false });
      this.form.markAllAsTouched();
      return;
    }

    this.store['submit']({ value: this.buildPayload(), isValid: true });
    this.closeEditDialog();
  }

  closeEditDialog(): void {
    this.isEditDialogOpen.set(false);
    this.startCreate();
  }

  delete(id: string): void {
    if (!confirmDeleteAction('материал')) {
      return;
    }
    this.store['delete'](id);
  }

  hasError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (this.vm().formSubmitAttempted || c.touched || c.dirty);
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid;
  }

  errorText(controlName: string): string {
    const c = this.form.get(controlName);
    if (!c) return '';
    if (c.hasError('required')) return '';
    if (c.hasError('minlength')) return 'Минимум 2 символа.';
    return 'Проверь значение поля.';
  }

  private buildPayload() {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      code: value.code?.trim() || '',
      densityKgM3: value.densityKgM3 ?? undefined,
      colorName: value.colorName?.trim() || '',
      colorHex: value.colorHex?.trim() || '',
      notes: value.notes?.trim() || '',
      isActive: value.isActive,
    };
  }
}

