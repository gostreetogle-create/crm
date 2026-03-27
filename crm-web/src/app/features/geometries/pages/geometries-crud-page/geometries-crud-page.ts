import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import {
  CrudLayoutComponent,
  TableColumn,
} from 'src/app/shared/ui/crud-layout/public-api';
import { UiModal as UiModalComponent } from 'src/app/shared/ui/modal/public-api';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiCheckboxFieldComponent } from '../../../../shared/ui/ui-checkbox-field/ui-checkbox-field.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import { HasPermissionDirective } from '../../../../shared/directives/public-api';
import { PermissionsService } from '../../../../core/auth/public-api';
import { GeometriesStore } from '../../state/geometries.store';
import {
  GEOMETRY_DIAMETER_LABEL,
  GeometryDimKey,
  isGeometryDimensionRequired,
  isGeometryDimensionVisible,
} from '../../utils/geometry-shape-config';

@Component({
  selector: 'app-geometries-crud-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    PageShellComponent,
    CrudLayoutComponent,
    ContentCardComponent,
    UiModalComponent,
    UiButtonComponent,
    UiCheckboxFieldComponent,
    UiFormFieldComponent,
    HasPermissionDirective,
  ],
  templateUrl: './geometries-crud-page.html',
  styleUrl: './geometries-crud-page.scss',
})
export class GeometriesCrudPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly sub = new Subscription();
  readonly store = inject(GeometriesStore);
  readonly permissions = inject(PermissionsService);

  readonly geometryColumns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'shape', label: 'Тип' },
    { key: 'params', label: 'Параметры' },
    { key: 'isActiveLabel', label: 'Активна' },
  ];
  readonly vm = computed(() => ({
    geometriesData: this.store['geometriesData'](),
    facts: this.store['facts'](),
    isEditMode: this.store['isEditMode'](),
    isEditDialogOpen: this.store['isEditDialogOpen'](),
    editId: this.store['editId'](),
    formSubmitAttempted: this.store['formSubmitAttempted'](),
  }));

  /** Подпись поля диаметра со знаком ⌀ */
  readonly geometryDiameterLabel = GEOMETRY_DIAMETER_LABEL;
  readonly shapeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'rectangular', label: 'Прямоугольная' },
    { value: 'cylindrical', label: 'Цилиндрическая' },
    { value: 'tube', label: 'Труба' },
    { value: 'plate', label: 'Лист' },
    { value: 'custom', label: 'Произвольная' },
  ];
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
    this.store['loadItems']();
    this.applyShapeValidators(this.form.controls.shapeKey.value);
    this.sub.add(
      this.form.controls.shapeKey.valueChanges.subscribe((shape) => {
        this.applyShapeValidators(shape);
      })
    );
  }

  startCreate(): void {
    if (!this.permissions.can('crud.create')) {
      return;
    }
    this.store['startCreate']();
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

  openEditDialog(id: string): void {
    if (!this.permissions.can('crud.edit')) {
      return;
    }
    const item = this.store['items']().find((x) => x.id === id);
    if (!item) return;
    this.store['openEdit'](item.id);
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
    this.store['closeDialog']();
    this.startCreate();
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
  }

  delete(id: string): void {
    if (!this.permissions.can('crud.delete')) {
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
    if (c.hasError('min')) return 'Значение не может быть меньше 0.';
    return 'Проверь значение поля.';
  }

  shapeLabel(shapeKey: string): string {
    return this.shapeOptions.find((x) => x.value === shapeKey)?.label ?? shapeKey;
  }

  dimensionVisible(field: GeometryDimKey): boolean {
    return isGeometryDimensionVisible(this.form.controls.shapeKey.value, field);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private applyShapeValidators(shapeKey: string): void {
    const optionalNonNegative = [Validators.min(0)];
    const requiredNonNeg = [Validators.required, ...optionalNonNegative];
    const keys: GeometryDimKey[] = ['heightMm', 'lengthMm', 'widthMm', 'diameterMm', 'thicknessMm'];
    for (const key of keys) {
      const control = this.form.controls[key];
      control.clearValidators();
      if (!isGeometryDimensionVisible(shapeKey, key)) {
        control.setValidators(optionalNonNegative);
        control.updateValueAndValidity({ emitEvent: false });
        continue;
      }
      if (isGeometryDimensionRequired(shapeKey, key)) {
        control.setValidators(requiredNonNeg);
      } else {
        control.setValidators(optionalNonNegative);
      }
      control.updateValueAndValidity({ emitEvent: false });
    }
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

