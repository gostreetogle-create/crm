import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, map } from 'rxjs';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { PageHeaderComponent, FactRow } from '../../../../shared/ui/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiCheckboxFieldComponent } from '../../../../shared/ui/ui-checkbox-field/ui-checkbox-field.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import {
  GEOMETRIES_REPOSITORY,
  GeometriesRepository,
} from '../../data/geometries.repository';
import { GeometryItem } from '../../model/geometry-item';

@Component({
  selector: 'app-geometries-crud-page',
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
  templateUrl: './geometries-crud-page.html',
  styleUrl: './geometries-crud-page.scss',
})
export class GeometriesCrudPage implements OnDestroy {
  private readonly repo = inject<GeometriesRepository>(GEOMETRIES_REPOSITORY);
  private readonly fb = inject(FormBuilder);
  private readonly sub = new Subscription();

  readonly items$ = this.repo.getItems();
  readonly facts$ = this.items$.pipe(
    map(
      (items): FactRow[] => [
        { label: 'Сущность', value: 'geometry' },
        { label: 'Записей', value: String(items.length) },
        { label: 'Режим', value: 'mock CRUD' },
      ]
    )
  );

  readonly shapeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'rectangular', label: 'Прямоугольная' },
    { value: 'cylindrical', label: 'Цилиндрическая' },
    { value: 'tube', label: 'Труба' },
    { value: 'plate', label: 'Лист' },
    { value: 'custom', label: 'Произвольная' },
  ];
  editId: string | null = null;
  isEditDialogOpen = false;
  formSubmitAttempted = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shapeKey: ['rectangular', Validators.required],
    heightMm: [null as number | null, [Validators.min(0)]],
    lengthMm: [null as number | null, [Validators.min(0)]],
    widthMm: [null as number | null, [Validators.min(0)]],
    diameterMm: [null as number | null, [Validators.min(0)]],
    thicknessMm: [null as number | null, [Validators.min(0)]],
    notes: [''],
    isActive: [true],
  });

  constructor() {
    this.applyShapeValidators(this.form.controls.shapeKey.value);
    this.sub.add(
      this.form.controls.shapeKey.valueChanges.subscribe((shape) => {
        this.applyShapeValidators(shape);
      })
    );
  }

  startCreate(): void {
    this.editId = null;
    this.isEditDialogOpen = false;
    this.formSubmitAttempted = false;
    this.form.reset({
      name: '',
      shapeKey: 'rectangular',
      heightMm: null,
      lengthMm: null,
      widthMm: null,
      diameterMm: null,
      thicknessMm: null,
      notes: '',
      isActive: true,
    });
  }

  openEditDialog(item: GeometryItem): void {
    this.editId = item.id;
    this.isEditDialogOpen = true;
    this.formSubmitAttempted = false;
    this.form.reset({
      name: item.name ?? '',
      shapeKey: item.shapeKey ?? 'rectangular',
      heightMm: item.heightMm ?? null,
      lengthMm: item.lengthMm ?? null,
      widthMm: item.widthMm ?? null,
      diameterMm: item.diameterMm ?? null,
      thicknessMm: item.thicknessMm ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
  }

  closeEditDialog(): void {
    this.startCreate();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isEditDialogOpen) {
      this.closeEditDialog();
    }
  }

  submitCreate(): void {
    this.formSubmitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.repo.create(this.buildPayload());
    this.startCreate();
  }

  submitEdit(): void {
    this.formSubmitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.editId) {
      return;
    }

    this.repo.update(this.editId, this.buildPayload());
    this.closeEditDialog();
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
    if (c.hasError('min')) return 'Значение не может быть меньше 0.';
    return 'Проверь значение поля.';
  }

  shapeLabel(shapeKey: string): string {
    return this.shapeOptions.find((x) => x.value === shapeKey)?.label ?? shapeKey;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private applyShapeValidators(shapeKey: string): void {
    this.setDimensionValidators('heightMm', this.isRequiredForShape(shapeKey, 'heightMm'));
    this.setDimensionValidators('lengthMm', this.isRequiredForShape(shapeKey, 'lengthMm'));
    this.setDimensionValidators('widthMm', this.isRequiredForShape(shapeKey, 'widthMm'));
    this.setDimensionValidators('diameterMm', this.isRequiredForShape(shapeKey, 'diameterMm'));
    this.setDimensionValidators('thicknessMm', this.isRequiredForShape(shapeKey, 'thicknessMm'));
  }

  private setDimensionValidators(
    controlName: 'heightMm' | 'lengthMm' | 'widthMm' | 'diameterMm' | 'thicknessMm',
    required: boolean
  ): void {
    const control = this.form.controls[controlName];
    const validators = required ? [Validators.required, Validators.min(0)] : [Validators.min(0)];
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private isRequiredForShape(
    shapeKey: string,
    field: 'heightMm' | 'lengthMm' | 'widthMm' | 'diameterMm' | 'thicknessMm'
  ): boolean {
    if (shapeKey === 'rectangular') return field === 'heightMm' || field === 'widthMm';
    if (shapeKey === 'tube') return field === 'diameterMm' || field === 'thicknessMm';
    if (shapeKey === 'plate')
      return field === 'lengthMm' || field === 'widthMm' || field === 'thicknessMm';
    if (shapeKey === 'cylindrical') return field === 'diameterMm' || field === 'lengthMm';
    return false;
  }

  private buildPayload() {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      shapeKey: value.shapeKey,
      heightMm: value.heightMm ?? undefined,
      lengthMm: value.lengthMm ?? undefined,
      widthMm: value.widthMm ?? undefined,
      diameterMm: value.diameterMm ?? undefined,
      thicknessMm: value.thicknessMm ?? undefined,
      notes: value.notes?.trim() || '',
      isActive: value.isActive,
    };
  }
}

