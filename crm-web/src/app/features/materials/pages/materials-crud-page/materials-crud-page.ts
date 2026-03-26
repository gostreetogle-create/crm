import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { PageHeaderComponent, FactRow } from '../../../../shared/ui/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiCheckboxFieldComponent } from '../../../../shared/ui/ui-checkbox-field/ui-checkbox-field.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import {
  MATERIALS_REPOSITORY,
  MaterialsRepository,
} from '../../data/materials.repository';
import { MaterialItem } from '../../model/material-item';

@Component({
  selector: 'app-materials-crud-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    ReactiveFormsModule,
    PageShellComponent,
    PageHeaderComponent,
    ContentCardComponent,
    UiButtonComponent,
    UiCheckboxFieldComponent,
    UiFormFieldComponent,
  ],
  templateUrl: './materials-crud-page.html',
  styleUrl: './materials-crud-page.scss',
})
export class MaterialsCrudPage {
  private readonly repo = inject<MaterialsRepository>(MATERIALS_REPOSITORY);
  private readonly fb = inject(FormBuilder);

  readonly items$ = this.repo.getItems();
  readonly facts$ = this.items$.pipe(
    map(
      (items): FactRow[] => [
        { label: 'Сущность', value: 'material' },
        { label: 'Записей', value: String(items.length) },
        { label: 'Режим', value: 'mock CRUD' },
      ]
    )
  );

  editId: string | null = null;
  formSubmitAttempted = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    densityKgM3: [null as number | null],
    colorName: [''],
    colorHex: [''],
    notes: [''],
    isActive: [true],
  });

  startCreate(): void {
    this.editId = null;
    this.formSubmitAttempted = false;
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

  startEdit(item: MaterialItem): void {
    this.editId = item.id;
    this.formSubmitAttempted = false;
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

  submit(): void {
    this.formSubmitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      code: value.code?.trim() || '',
      densityKgM3: value.densityKgM3 ?? undefined,
      colorName: value.colorName?.trim() || '',
      colorHex: value.colorHex?.trim() || '',
      notes: value.notes?.trim() || '',
      isActive: value.isActive,
    };

    if (this.editId) {
      this.repo.update(this.editId, payload);
    } else {
      this.repo.create(payload);
    }

    this.startCreate();
  }

  delete(id: string): void {
    this.repo.remove(id);
    if (this.editId === id) {
      this.startCreate();
    }
  }

  hasError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (this.formSubmitAttempted || c.touched || c.dirty);
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
}

