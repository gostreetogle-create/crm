import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PermissionsService } from '../../../../core/auth/public-api';
import { GeometriesStore } from '../../../geometries/state/geometries.store';
import { MaterialsStore } from '../../../materials/state/materials.store';
import { UnitsStore } from '../../../units/state/units.store';
import { ColorsStore } from '../../../colors/state/colors.store';
import { CoatingsStore } from '../../../coatings/state/coatings.store';
import { SurfaceFinishesStore } from '../../../surface-finishes/state/surface-finishes.store';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { CrudLayoutComponent, TableColumn } from '../../../../shared/ui/crud-layout/public-api';
import { UiModal as UiModalComponent } from '../../../../shared/ui/modal/public-api';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiCheckboxFieldComponent } from '../../../../shared/ui/ui-checkbox-field/ui-checkbox-field.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import { HexRgbFieldComponent } from '../../../../shared/ui/hex-rgb-field/public-api';

@Component({
  selector: 'app-dictionaries-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    PageShellComponent,
    ContentCardComponent,
    CrudLayoutComponent,
    UiModalComponent,
    UiButtonComponent,
    UiCheckboxFieldComponent,
    UiFormFieldComponent,
    HexRgbFieldComponent,
  ],
  templateUrl: './dictionaries-page.html',
  styleUrl: './dictionaries-page.scss',
})
export class DictionariesPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly sub = new Subscription();

  readonly permissions = inject(PermissionsService);
  readonly materialsStore = inject(MaterialsStore);
  readonly geometriesStore = inject(GeometriesStore);
  readonly unitsStore = inject(UnitsStore);
  readonly colorsStore = inject(ColorsStore);
  readonly coatingsStore = inject(CoatingsStore);
  readonly surfaceFinishesStore = inject(SurfaceFinishesStore);

  readonly isMaterialsModalOpen = signal(false);
  readonly isGeometriesModalOpen = signal(false);
  readonly isUnitsModalOpen = signal(false);
  readonly isColorsModalOpen = signal(false);
  readonly isCoatingsModalOpen = signal(false);
  readonly isSurfaceFinishesModalOpen = signal(false);
  readonly isMaterialsViewMode = signal(false);
  readonly isGeometriesViewMode = signal(false);
  readonly isUnitsViewMode = signal(false);
  readonly isColorsViewMode = signal(false);
  readonly isCoatingsViewMode = signal(false);
  readonly isSurfaceFinishesViewMode = signal(false);
  readonly colorQuickAddForMaterials = signal(false);
  readonly coatingQuickAddForMaterials = signal(false);
  readonly surfaceQuickAddForMaterials = signal(false);
  readonly excelImportStatus = signal('');

  readonly materialsColumns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'densityKgM3', label: 'Плотность' },
    { key: 'color', label: 'Цвет' },
    { key: 'finish', label: 'Финиш/шерох.' },
    { key: 'coating', label: 'Покрытие' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly geometriesColumns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'shape', label: 'Тип' },
    { key: 'params', label: 'Параметры' },
    { key: 'isActiveLabel', label: 'Активна' },
  ];

  readonly unitsColumns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'notes', label: 'Комментарий' },
    { key: 'isActiveLabel', label: 'Активна' },
  ];

  readonly colorsColumns: TableColumn[] = [
    { key: 'ralCode', label: 'RAL' },
    { key: 'name', label: 'Название' },
    { key: 'hex', label: 'HEX' },
    { key: 'rgb', label: 'RGB' },
  ];

  readonly surfaceFinishesColumns: TableColumn[] = [
    { key: 'finishType', label: 'Тип финиша' },
    { key: 'roughnessClass', label: 'Шероховатость' },
    { key: 'raMicron', label: 'Ra, мкм' },
  ];

  readonly coatingsColumns: TableColumn[] = [
    { key: 'coatingType', label: 'Тип покрытия' },
    { key: 'coatingSpec', label: 'Спецификация' },
    { key: 'thicknessMicron', label: 'Толщина, мкм' },
  ];

  readonly materialsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    densityKgM3: [null as number | null],
    colorId: [''],
    colorName: [''],
    colorHex: [''],
    surfaceFinishId: [''],
    finishType: [''],
    roughnessClass: [''],
    raMicron: [null as number | null],
    coatingId: [''],
    coatingType: [''],
    coatingSpec: [''],
    coatingThicknessMicron: [null as number | null],
    notes: [''],
    isActive: [true],
  });

  readonly shapeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'rectangular', label: 'Прямоугольная' },
    { value: 'cylindrical', label: 'Цилиндрическая' },
    { value: 'tube', label: 'Труба' },
    { value: 'plate', label: 'Лист' },
    { value: 'custom', label: 'Произвольная' },
  ];

  readonly geometriesForm = this.fb.nonNullable.group({
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

  readonly unitsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    code: ['', [Validators.required, Validators.minLength(2)]],
    notes: [''],
    isActive: [true],
  });

  readonly colorsForm = this.fb.nonNullable.group({
    ralCode: ['', [Validators.required, Validators.minLength(4)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    hex: ['#000000', [Validators.required, Validators.pattern(/^#([A-Fa-f0-9]{6})$/)]],
  });

  readonly surfaceFinishesForm = this.fb.nonNullable.group({
    finishType: ['', [Validators.required, Validators.minLength(2)]],
    roughnessClass: ['', [Validators.required, Validators.minLength(2)]],
    raMicron: [null as number | null, [Validators.min(0)]],
  });

  readonly coatingsForm = this.fb.nonNullable.group({
    coatingType: ['', [Validators.required, Validators.minLength(2)]],
    coatingSpec: ['', [Validators.required, Validators.minLength(2)]],
    thicknessMicron: [null as number | null, [Validators.min(0)]],
  });

  constructor() {
    this.materialsStore.loadItems();
    this.geometriesStore.loadItems();
    this.unitsStore.loadItems();
    this.colorsStore.loadItems();
    this.coatingsStore.loadItems();
    this.surfaceFinishesStore.loadItems();

    this.applyGeometryShapeValidators(this.geometriesForm.controls.shapeKey.value);
    this.sub.add(
      this.geometriesForm.controls.shapeKey.valueChanges.subscribe((shape) => {
        this.applyGeometryShapeValidators(shape);
      })
    );
    this.sub.add(
      this.materialsForm.controls.colorId.valueChanges.subscribe((id) => {
        this.syncMaterialColorFromReference(id ?? '');
      })
    );
    this.sub.add(
      this.materialsForm.controls.surfaceFinishId.valueChanges.subscribe((id) => {
        this.syncMaterialFinishFromReference(id ?? '');
      })
    );
    this.sub.add(
      this.materialsForm.controls.coatingId.valueChanges.subscribe((id) => {
        this.syncMaterialCoatingFromReference(id ?? '');
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  openMaterialsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    this.materialsStore.startCreate();
    this.materialsForm.reset({
      name: '',
      code: '',
      densityKgM3: null,
      colorId: '',
      colorName: '',
      colorHex: '',
      surfaceFinishId: '',
      finishType: '',
      roughnessClass: '',
      raMicron: null,
      coatingId: '',
      coatingType: '',
      coatingSpec: '',
      coatingThicknessMicron: null,
      notes: '',
      isActive: true,
    });
    this.isMaterialsModalOpen.set(true);
  }

  openMaterialsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    const item = this.materialsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.materialsStore.startEdit(item.id);
    this.materialsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorId: item.colorId ?? '',
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      surfaceFinishId: item.surfaceFinishId ?? '',
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
      coatingId: item.coatingId ?? '',
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      coatingThicknessMicron: item.coatingThicknessMicron ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.syncMaterialColorFromReference(item.colorId ?? '');
    this.syncMaterialFinishFromReference(item.surfaceFinishId ?? '');
    this.syncMaterialCoatingFromReference(item.coatingId ?? '');
    this.isMaterialsModalOpen.set(true);
  }

  closeMaterialsModal(): void {
    this.materialsStore.resetForm();
    this.isMaterialsViewMode.set(false);
    this.isMaterialsModalOpen.set(false);
  }

  submitMaterials(): void {
    const payload = this.buildMaterialsPayload();
    if (this.materialsForm.invalid) {
      this.materialsStore.submit({ value: payload, isValid: false });
      this.materialsForm.markAllAsTouched();
      return;
    }
    this.materialsStore.submit({ value: payload, isValid: true });
    this.closeMaterialsModal();
  }

  deleteMaterial(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.materialsStore.delete(id);
  }

  duplicateMaterial(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.materialsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    this.materialsStore.startCreate();
    this.materialsForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorId: item.colorId ?? '',
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      surfaceFinishId: item.surfaceFinishId ?? '',
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
      coatingId: item.coatingId ?? '',
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      coatingThicknessMicron: item.coatingThicknessMicron ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.syncMaterialColorFromReference(item.colorId ?? '');
    this.syncMaterialFinishFromReference(item.surfaceFinishId ?? '');
    this.syncMaterialCoatingFromReference(item.coatingId ?? '');
    this.isMaterialsModalOpen.set(true);
  }

  openMaterialsView(id: string): void {
    const item = this.materialsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.materialsStore.resetForm();
    this.materialsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorId: item.colorId ?? '',
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      surfaceFinishId: item.surfaceFinishId ?? '',
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
      coatingId: item.coatingId ?? '',
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      coatingThicknessMicron: item.coatingThicknessMicron ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.syncMaterialColorFromReference(item.colorId ?? '');
    this.syncMaterialFinishFromReference(item.surfaceFinishId ?? '');
    this.syncMaterialCoatingFromReference(item.coatingId ?? '');
    this.materialsForm.disable({ emitEvent: false });
    this.isMaterialsViewMode.set(true);
    this.isMaterialsModalOpen.set(true);
  }

  openGeometriesCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isGeometriesViewMode.set(false);
    this.geometriesForm.enable({ emitEvent: false });
    this.geometriesStore.startCreate();
    this.geometriesForm.reset({
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
    this.isGeometriesModalOpen.set(true);
  }

  openGeometriesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isGeometriesViewMode.set(false);
    this.geometriesForm.enable({ emitEvent: false });
    const item = this.geometriesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.geometriesStore.openEdit(item.id);
    this.geometriesForm.reset({
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
    this.isGeometriesModalOpen.set(true);
  }

  closeGeometriesModal(): void {
    this.geometriesStore.closeDialog();
    this.isGeometriesViewMode.set(false);
    this.isGeometriesModalOpen.set(false);
  }

  submitGeometries(): void {
    const payload = this.buildGeometriesPayload();
    if (this.geometriesForm.invalid) {
      this.geometriesStore.submit({ value: payload, isValid: false });
      this.geometriesForm.markAllAsTouched();
      return;
    }
    this.geometriesStore.submit({ value: payload, isValid: true });
    this.closeGeometriesModal();
  }

  deleteGeometry(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.geometriesStore.delete(id);
  }

  duplicateGeometry(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.geometriesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isGeometriesViewMode.set(false);
    this.geometriesForm.enable({ emitEvent: false });
    this.geometriesStore.startCreate();
    this.geometriesForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      shapeKey: item.shapeKey ?? 'rectangular',
      heightMm: item.heightMm ?? null,
      lengthMm: item.lengthMm ?? null,
      widthMm: item.widthMm ?? null,
      diameterMm: item.diameterMm ?? null,
      thicknessMm: item.thicknessMm ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isGeometriesModalOpen.set(true);
  }

  openGeometriesView(id: string): void {
    const item = this.geometriesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.geometriesStore.closeDialog();
    this.geometriesForm.reset({
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
    this.geometriesForm.disable({ emitEvent: false });
    this.isGeometriesViewMode.set(true);
    this.isGeometriesModalOpen.set(true);
  }

  openUnitsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isUnitsViewMode.set(false);
    this.unitsForm.enable({ emitEvent: false });
    this.unitsStore.startCreate();
    this.unitsForm.reset({
      name: '',
      code: '',
      notes: '',
      isActive: true,
    });
    this.isUnitsModalOpen.set(true);
  }

  openUnitsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isUnitsViewMode.set(false);
    this.unitsForm.enable({ emitEvent: false });
    const item = this.unitsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.unitsStore.startEdit(item.id);
    this.unitsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isUnitsModalOpen.set(true);
  }

  closeUnitsModal(): void {
    this.unitsStore.resetForm();
    this.isUnitsViewMode.set(false);
    this.isUnitsModalOpen.set(false);
  }

  submitUnits(): void {
    const payload = this.buildUnitsPayload();
    if (this.unitsForm.invalid) {
      this.unitsStore.submit({ value: payload, isValid: false });
      this.unitsForm.markAllAsTouched();
      return;
    }
    this.unitsStore.submit({ value: payload, isValid: true });
    this.closeUnitsModal();
  }

  deleteUnit(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.unitsStore.delete(id);
  }

  duplicateUnit(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.unitsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isUnitsViewMode.set(false);
    this.unitsForm.enable({ emitEvent: false });
    this.unitsStore.startCreate();
    this.unitsForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      code: item.code ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isUnitsModalOpen.set(true);
  }

  openUnitsView(id: string): void {
    const item = this.unitsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.unitsStore.resetForm();
    this.unitsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.unitsForm.disable({ emitEvent: false });
    this.isUnitsViewMode.set(true);
    this.isUnitsModalOpen.set(true);
  }

  openColorsCreate(fromMaterials = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isColorsViewMode.set(false);
    this.colorsForm.enable({ emitEvent: false });
    this.colorsStore.startCreate();
    this.colorsForm.reset({
      ralCode: '',
      name: '',
      hex: '#000000',
    });
    this.colorQuickAddForMaterials.set(fromMaterials);
    this.isColorsModalOpen.set(true);
  }

  openColorsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isColorsViewMode.set(false);
    this.colorsForm.enable({ emitEvent: false });
    const item = this.colorsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.colorsStore.startEdit(item.id);
    this.colorsForm.reset({
      ralCode: item.ralCode ?? '',
      name: item.name ?? '',
      hex: item.hex ?? '#000000',
    });
    this.isColorsModalOpen.set(true);
  }

  closeColorsModal(): void {
    this.colorsStore.resetForm();
    this.isColorsViewMode.set(false);
    this.colorQuickAddForMaterials.set(false);
    this.isColorsModalOpen.set(false);
  }

  submitColors(): void {
    const payload = this.buildColorsPayload();
    if (this.colorsForm.invalid) {
      this.colorsStore.submit({ value: payload, isValid: false });
      this.colorsForm.markAllAsTouched();
      return;
    }
    const quickAdd = this.colorQuickAddForMaterials();
    const createdCode = payload.ralCode;
    this.colorsStore.submit({ value: payload, isValid: true });
    if (quickAdd) {
      queueMicrotask(() => {
        const created = this.colorsStore.items().find((x) => x.ralCode === createdCode);
        if (created) {
          this.materialsForm.controls.colorId.setValue(created.id);
        }
      });
    }
    this.closeColorsModal();
  }

  deleteColor(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.colorsStore.delete(id);
    if (this.materialsForm.controls.colorId.value === id) {
      this.materialsForm.controls.colorId.setValue('');
    }
  }

  duplicateColor(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.colorsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isColorsViewMode.set(false);
    this.colorsForm.enable({ emitEvent: false });
    this.colorsStore.startCreate();
    this.colorsForm.reset({
      ralCode: item.ralCode,
      name: `${item.name} (копия)`,
      hex: item.hex,
    });
    this.isColorsModalOpen.set(true);
  }

  openColorsView(id: string): void {
    const item = this.colorsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.colorsStore.resetForm();
    this.colorsForm.reset({
      ralCode: item.ralCode ?? '',
      name: item.name ?? '',
      hex: item.hex ?? '#000000',
    });
    this.colorsForm.disable({ emitEvent: false });
    this.isColorsViewMode.set(true);
    this.isColorsModalOpen.set(true);
  }

  openSurfaceFinishesCreate(fromMaterials = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceFinishesForm.enable({ emitEvent: false });
    this.surfaceFinishesStore.startCreate();
    this.surfaceFinishesForm.reset({
      finishType: '',
      roughnessClass: '',
      raMicron: null,
    });
    this.surfaceQuickAddForMaterials.set(fromMaterials);
    this.isSurfaceFinishesModalOpen.set(true);
  }

  openSurfaceFinishesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceFinishesForm.enable({ emitEvent: false });
    const item = this.surfaceFinishesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.surfaceFinishesStore.startEdit(item.id);
    this.surfaceFinishesForm.reset({
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
    });
    this.isSurfaceFinishesModalOpen.set(true);
  }

  closeSurfaceFinishesModal(): void {
    this.surfaceFinishesStore.resetForm();
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceQuickAddForMaterials.set(false);
    this.isSurfaceFinishesModalOpen.set(false);
  }

  submitSurfaceFinishes(): void {
    const payload = this.buildSurfaceFinishPayload();
    if (this.surfaceFinishesForm.invalid) {
      this.surfaceFinishesStore.submit({ value: payload, isValid: false });
      this.surfaceFinishesForm.markAllAsTouched();
      return;
    }
    const quickAdd = this.surfaceQuickAddForMaterials();
    const snapshotKey = `${payload.finishType}|${payload.roughnessClass}|${payload.raMicron ?? ''}`;
    this.surfaceFinishesStore.submit({ value: payload, isValid: true });
    if (quickAdd) {
      queueMicrotask(() => {
        const created = this.surfaceFinishesStore
          .items()
          .find(
            (x) =>
              `${x.finishType}|${x.roughnessClass}|${x.raMicron ?? ''}` === snapshotKey
          );
        if (created) {
          this.materialsForm.controls.surfaceFinishId.setValue(created.id);
        }
      });
    }
    this.closeSurfaceFinishesModal();
  }

  deleteSurfaceFinish(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.surfaceFinishesStore.delete(id);
    if (this.materialsForm.controls.surfaceFinishId.value === id) {
      this.materialsForm.controls.surfaceFinishId.setValue('');
    }
  }

  duplicateSurfaceFinish(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.surfaceFinishesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceFinishesForm.enable({ emitEvent: false });
    this.surfaceFinishesStore.startCreate();
    this.surfaceFinishesForm.reset({
      finishType: `${item.finishType} (копия)`,
      roughnessClass: item.roughnessClass,
      raMicron: item.raMicron ?? null,
    });
    this.isSurfaceFinishesModalOpen.set(true);
  }

  openSurfaceFinishesView(id: string): void {
    const item = this.surfaceFinishesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.surfaceFinishesStore.resetForm();
    this.surfaceFinishesForm.reset({
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
    });
    this.surfaceFinishesForm.disable({ emitEvent: false });
    this.isSurfaceFinishesViewMode.set(true);
    this.isSurfaceFinishesModalOpen.set(true);
  }

  openCoatingsCreate(fromMaterials = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isCoatingsViewMode.set(false);
    this.coatingsForm.enable({ emitEvent: false });
    this.coatingsStore.startCreate();
    this.coatingsForm.reset({
      coatingType: '',
      coatingSpec: '',
      thicknessMicron: null,
    });
    this.coatingQuickAddForMaterials.set(fromMaterials);
    this.isCoatingsModalOpen.set(true);
  }

  openCoatingsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isCoatingsViewMode.set(false);
    this.coatingsForm.enable({ emitEvent: false });
    const item = this.coatingsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.coatingsStore.startEdit(item.id);
    this.coatingsForm.reset({
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      thicknessMicron: item.thicknessMicron ?? null,
    });
    this.isCoatingsModalOpen.set(true);
  }

  closeCoatingsModal(): void {
    this.coatingsStore.resetForm();
    this.isCoatingsViewMode.set(false);
    this.coatingQuickAddForMaterials.set(false);
    this.isCoatingsModalOpen.set(false);
  }

  submitCoatings(): void {
    const payload = this.buildCoatingPayload();
    if (this.coatingsForm.invalid) {
      this.coatingsStore.submit({ value: payload, isValid: false });
      this.coatingsForm.markAllAsTouched();
      return;
    }
    const quickAdd = this.coatingQuickAddForMaterials();
    const snapshotKey = `${payload.coatingType}|${payload.coatingSpec}|${payload.thicknessMicron ?? ''}`;
    this.coatingsStore.submit({ value: payload, isValid: true });
    if (quickAdd) {
      queueMicrotask(() => {
        const created = this.coatingsStore
          .items()
          .find(
            (x) =>
              `${x.coatingType}|${x.coatingSpec}|${x.thicknessMicron ?? ''}` === snapshotKey
          );
        if (created) {
          this.materialsForm.controls.coatingId.setValue(created.id);
        }
      });
    }
    this.closeCoatingsModal();
  }

  deleteCoating(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.coatingsStore.delete(id);
    if (this.materialsForm.controls.coatingId.value === id) {
      this.materialsForm.controls.coatingId.setValue('');
    }
  }

  duplicateCoating(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.coatingsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isCoatingsViewMode.set(false);
    this.coatingsForm.enable({ emitEvent: false });
    this.coatingsStore.startCreate();
    this.coatingsForm.reset({
      coatingType: `${item.coatingType} (копия)`,
      coatingSpec: item.coatingSpec,
      thicknessMicron: item.thicknessMicron ?? null,
    });
    this.isCoatingsModalOpen.set(true);
  }

  openCoatingsView(id: string): void {
    const item = this.coatingsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.coatingsStore.resetForm();
    this.coatingsForm.reset({
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      thicknessMicron: item.thicknessMicron ?? null,
    });
    this.coatingsForm.disable({ emitEvent: false });
    this.isCoatingsViewMode.set(true);
    this.isCoatingsModalOpen.set(true);
  }

  selectedMaterialColorHex(): string {
    const id = this.materialsForm.controls.colorId.value;
    const selected = this.colorsStore.options().find((x) => x.id === id);
    return selected?.hex ?? this.materialsForm.controls.colorHex.value ?? '';
  }

  private async exportRowsToExcel(
    filename: string,
    sheetName: string,
    rows: Array<Record<string, string | number>>,
    headers: string[]
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

  async exportColorsExcel(): Promise<void> {
    const rows = this.colorsStore.items().map((item) => ({
      RAL: item.ralCode,
      Название: item.name,
      HEX: item.hex,
      RGB: `${item.rgb.r},${item.rgb.g},${item.rgb.b}`,
    }));
    await this.exportRowsToExcel('ral-colors.xlsx', 'RAL', rows, ['RAL', 'Название', 'HEX', 'RGB']);
    this.excelImportStatus.set(`Экспортировано: ${rows.length} строк.`);
  }

  async downloadColorsTemplateExcel(): Promise<void> {
    const rows = [
      { RAL: 'RAL 7035', Название: 'Light grey', HEX: '#CBD0CC', RGB: '203,208,204' },
      { RAL: 'RAL 9005', Название: 'Jet black', HEX: '#0A0A0D', RGB: '10,10,13' },
    ];
    await this.exportRowsToExcel(
      'ral-colors-template.xlsx',
      'RAL_TEMPLATE',
      rows,
      ['RAL', 'Название', 'HEX', 'RGB']
    );
    this.excelImportStatus.set('Шаблон Excel скачан.');
  }

  async onColorsExcelImported(file: File): Promise<void> {
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        const parsed = this.validateAndMapColorRows(rows);
        if (!parsed.ok) {
          this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
          return;
        }
        this.colorsStore.createMany(parsed.rows);
        this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк.`);
      } catch {
        this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async onMaterialsExcelImported(file: File): Promise<void> {
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapMaterialsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.materialsStore.createMany(parsed.rows);
      this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк.`);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onGeometriesExcelImported(file: File): Promise<void> {
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapGeometriesRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.geometriesStore.createMany(parsed.rows);
      this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк.`);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onUnitsExcelImported(file: File): Promise<void> {
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapUnitsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.unitsStore.createMany(parsed.rows);
      this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк.`);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onSurfaceFinishesExcelImported(file: File): Promise<void> {
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapSurfaceFinishesRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.surfaceFinishesStore.createMany(parsed.rows);
      this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк.`);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onCoatingsExcelImported(file: File): Promise<void> {
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapCoatingsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.coatingsStore.createMany(parsed.rows);
      this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк.`);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async exportMaterialsExcel(): Promise<void> {
    const rows = this.materialsStore.items().map((item) => ({
      Название: item.name,
      Код: item.code ?? '',
      Плотность: item.densityKgM3 ?? '',
      Цвет: item.colorName ?? item.colorHex ?? '',
      Финиш: item.finishType ?? '',
      Покрытие: item.coatingType ?? '',
    }));
    await this.exportRowsToExcel(
      'materials.xlsx',
      'Materials',
      rows,
      ['Название', 'Код', 'Плотность', 'Цвет', 'Финиш', 'Покрытие']
    );
  }

  async downloadMaterialsTemplateExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'materials-template.xlsx',
      'Materials_TEMPLATE',
      [{ Название: 'Сталь 09Г2С', Код: 'ST-09G2S', Плотность: 7850, Цвет: 'RAL 7035', Финиш: 'Matte', Покрытие: 'Powder coating' }],
      ['Название', 'Код', 'Плотность', 'Цвет', 'Финиш', 'Покрытие']
    );
  }

  async exportGeometriesExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'geometries.xlsx',
      'Geometries',
      this.geometriesStore.geometriesData().map((x) => ({
        Название: x.name,
        Тип: x.shape,
        Параметры: x.params,
      })),
      ['Название', 'Тип', 'Параметры']
    );
  }

  async downloadGeometriesTemplateExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'geometries-template.xlsx',
      'Geometries_TEMPLATE',
      [{ Название: 'Круглая труба 32x2', Тип: 'tube', Параметры: 'Дн 32, Толщ 2' }],
      ['Название', 'Тип', 'Параметры']
    );
  }

  async exportUnitsExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'units.xlsx',
      'Units',
      this.unitsStore.unitsData().map((x) => ({
        Название: x.name,
        Код: x.code,
        Комментарий: x.notes,
      })),
      ['Название', 'Код', 'Комментарий']
    );
  }

  async downloadUnitsTemplateExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'units-template.xlsx',
      'Units_TEMPLATE',
      [{ Название: 'шт', Код: 'pcs', Комментарий: 'Штуки' }],
      ['Название', 'Код', 'Комментарий']
    );
  }

  async exportSurfaceFinishesExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'surface-finishes.xlsx',
      'SurfaceFinishes',
      this.surfaceFinishesStore.surfaceFinishesData().map((x) => ({
        'Тип финиша': x.finishType,
        Шероховатость: x.roughnessClass,
        'Ra, мкм': x.raMicron,
      })),
      ['Тип финиша', 'Шероховатость', 'Ra, мкм']
    );
  }

  async downloadSurfaceFinishesTemplateExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'surface-finishes-template.xlsx',
      'SurfaceFinishes_TEMPLATE',
      [{ 'Тип финиша': 'Matte', Шероховатость: 'Ra 3.2', 'Ra, мкм': 3.2 }],
      ['Тип финиша', 'Шероховатость', 'Ra, мкм']
    );
  }

  async exportCoatingsExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'coatings.xlsx',
      'Coatings',
      this.coatingsStore.coatingsData().map((x) => ({
        'Тип покрытия': x.coatingType,
        Спецификация: x.coatingSpec,
        'Толщина, мкм': x.thicknessMicron,
      })),
      ['Тип покрытия', 'Спецификация', 'Толщина, мкм']
    );
  }

  async downloadCoatingsTemplateExcel(): Promise<void> {
    await this.exportRowsToExcel(
      'coatings-template.xlsx',
      'Coatings_TEMPLATE',
      [{ 'Тип покрытия': 'Anodizing', Спецификация: 'Clear anodized', 'Толщина, мкм': 20 }],
      ['Тип покрытия', 'Спецификация', 'Толщина, мкм']
    );
  }

  private syncMaterialColorFromReference(colorId: string): void {
    const selected = this.colorsStore.options().find((x) => x.id === colorId);
    if (!selected) {
      if (!colorId) {
        this.materialsForm.patchValue({ colorName: '', colorHex: '' }, { emitEvent: false });
      }
      return;
    }
    this.materialsForm.patchValue(
      {
        colorName: selected.label,
        colorHex: selected.hex,
      },
      { emitEvent: false }
    );
  }

  private syncMaterialFinishFromReference(surfaceFinishId: string): void {
    const selected = this.surfaceFinishesStore.options().find((x) => x.id === surfaceFinishId);
    if (!selected) {
      if (!surfaceFinishId) {
        this.materialsForm.patchValue(
          { finishType: '', roughnessClass: '', raMicron: null },
          { emitEvent: false }
        );
      }
      return;
    }
    this.materialsForm.patchValue(
      {
        finishType: selected.finishType,
        roughnessClass: selected.roughnessClass,
        raMicron: selected.raMicron ?? null,
      },
      { emitEvent: false }
    );
  }

  private syncMaterialCoatingFromReference(coatingId: string): void {
    const selected = this.coatingsStore.options().find((x) => x.id === coatingId);
    if (!selected) {
      if (!coatingId) {
        this.materialsForm.patchValue(
          { coatingType: '', coatingSpec: '', coatingThicknessMicron: null },
          { emitEvent: false }
        );
      }
      return;
    }
    this.materialsForm.patchValue(
      {
        coatingType: selected.coatingType,
        coatingSpec: selected.coatingSpec,
        coatingThicknessMicron: selected.thicknessMicron ?? null,
      },
      { emitEvent: false }
    );
  }

  isMaterialsInvalid(controlName: keyof typeof this.materialsForm.controls): boolean {
    const control = this.materialsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.materialsStore.formSubmitAttempted())
    );
  }

  isGeometriesInvalid(controlName: keyof typeof this.geometriesForm.controls): boolean {
    const control = this.geometriesForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.geometriesStore.formSubmitAttempted())
    );
  }

  isUnitsInvalid(controlName: keyof typeof this.unitsForm.controls): boolean {
    const control = this.unitsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.unitsStore.formSubmitAttempted())
    );
  }

  isColorsInvalid(controlName: keyof typeof this.colorsForm.controls): boolean {
    const control = this.colorsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.colorsStore.formSubmitAttempted())
    );
  }

  isSurfaceFinishesInvalid(
    controlName: keyof typeof this.surfaceFinishesForm.controls
  ): boolean {
    const control = this.surfaceFinishesForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.surfaceFinishesStore.formSubmitAttempted())
    );
  }

  isCoatingsInvalid(controlName: keyof typeof this.coatingsForm.controls): boolean {
    const control = this.coatingsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.coatingsStore.formSubmitAttempted())
    );
  }

  private buildMaterialsPayload() {
    return {
      name: this.materialsForm.controls.name.value.trim(),
      code: this.materialsForm.controls.code.value.trim() || undefined,
      densityKgM3: this.materialsForm.controls.densityKgM3.value ?? undefined,
      colorId: this.materialsForm.controls.colorId.value || undefined,
      colorName: this.materialsForm.controls.colorName.value.trim() || undefined,
      colorHex: this.materialsForm.controls.colorHex.value.trim() || undefined,
      surfaceFinishId: this.materialsForm.controls.surfaceFinishId.value || undefined,
      finishType: this.materialsForm.controls.finishType.value.trim() || undefined,
      roughnessClass: this.materialsForm.controls.roughnessClass.value.trim() || undefined,
      raMicron: this.materialsForm.controls.raMicron.value ?? undefined,
      coatingId: this.materialsForm.controls.coatingId.value || undefined,
      coatingType: this.materialsForm.controls.coatingType.value.trim() || undefined,
      coatingSpec: this.materialsForm.controls.coatingSpec.value.trim() || undefined,
      coatingThicknessMicron: this.materialsForm.controls.coatingThicknessMicron.value ?? undefined,
      notes: this.materialsForm.controls.notes.value.trim() || undefined,
      isActive: this.materialsForm.controls.isActive.value,
    };
  }

  private buildGeometriesPayload() {
    return {
      name: this.geometriesForm.controls.name.value.trim(),
      shapeKey: this.geometriesForm.controls.shapeKey.value,
      heightMm: this.geometriesForm.controls.heightMm.value ?? undefined,
      lengthMm: this.geometriesForm.controls.lengthMm.value ?? undefined,
      widthMm: this.geometriesForm.controls.widthMm.value ?? undefined,
      diameterMm: this.geometriesForm.controls.diameterMm.value ?? undefined,
      thicknessMm: this.geometriesForm.controls.thicknessMm.value ?? undefined,
      notes: this.geometriesForm.controls.notes.value.trim() || undefined,
      isActive: this.geometriesForm.controls.isActive.value,
    };
  }

  private buildUnitsPayload() {
    return {
      name: this.unitsForm.controls.name.value.trim(),
      code: this.unitsForm.controls.code.value.trim(),
      notes: this.unitsForm.controls.notes.value.trim() || undefined,
      isActive: this.unitsForm.controls.isActive.value,
    };
  }

  private buildColorsPayload() {
    const value = this.colorsForm.getRawValue();
    const normalizedHex = /^#([A-Fa-f0-9]{6})$/.test(value.hex)
      ? value.hex.toUpperCase()
      : '#000000';
    return {
      ralCode: value.ralCode.trim().toUpperCase(),
      name: value.name.trim(),
      hex: normalizedHex,
      rgb: {
        r: Number.parseInt(normalizedHex.slice(1, 3), 16),
        g: Number.parseInt(normalizedHex.slice(3, 5), 16),
        b: Number.parseInt(normalizedHex.slice(5, 7), 16),
      },
    };
  }

  private buildSurfaceFinishPayload() {
    return {
      finishType: this.surfaceFinishesForm.controls.finishType.value.trim(),
      roughnessClass: this.surfaceFinishesForm.controls.roughnessClass.value.trim(),
      raMicron: this.surfaceFinishesForm.controls.raMicron.value ?? undefined,
    };
  }

  private buildCoatingPayload() {
    return {
      coatingType: this.coatingsForm.controls.coatingType.value.trim(),
      coatingSpec: this.coatingsForm.controls.coatingSpec.value.trim(),
      thicknessMicron: this.coatingsForm.controls.thicknessMicron.value ?? undefined,
    };
  }

  private validateAndMapColorRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ ralCode: string; name: string; hex: string; rgb: { r: number; g: number; b: number } }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ ralCode: string; name: string; hex: string; rgb: { r: number; g: number; b: number } }> =
      [];
    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['RAL', 'Название', 'HEX', 'RGB'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return {
        ok: false,
        rows: mapped,
        errors: [`Нет колонок: ${missingHeaders.join(', ')}`],
      };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const ralCode = String(row['RAL'] ?? '').trim().toUpperCase();
      const name = String(row['Название'] ?? '').trim();
      const hex = String(row['HEX'] ?? '').trim().toUpperCase();
      const rgbRaw = String(row['RGB'] ?? '').trim();
      if (!ralCode || !name || !hex || !rgbRaw) {
        errors.push(`Строка ${rowNo}: заполните RAL/Название/HEX/RGB.`);
        return;
      }
      if (!/^#([A-F0-9]{6})$/.test(hex)) {
        errors.push(`Строка ${rowNo}: HEX должен быть #RRGGBB.`);
        return;
      }
      const rgbParts = rgbRaw
        .split(/[,\s;]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (rgbParts.length !== 3 || rgbParts.some((x) => !/^\d+$/.test(x))) {
        errors.push(`Строка ${rowNo}: RGB должен быть в формате R,G,B.`);
        return;
      }
      const [r, g, b] = rgbParts.map((x) => Number.parseInt(x, 10));
      if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) {
        errors.push(`Строка ${rowNo}: RGB вне диапазона 0..255.`);
        return;
      }
      const check = {
        r: Number.parseInt(hex.slice(1, 3), 16),
        g: Number.parseInt(hex.slice(3, 5), 16),
        b: Number.parseInt(hex.slice(5, 7), 16),
      };
      if (check.r !== r || check.g !== g || check.b !== b) {
        errors.push(`Строка ${rowNo}: RGB не соответствует HEX.`);
        return;
      }
      mapped.push({ ralCode, name, hex, rgb: { r, g, b } });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private parseNumberOrNull(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const s = String(raw).trim();
    if (!s) return null;
    const normalized = s.replace(/\s+/g, '').replace(',', '.');
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }

  private validateAndMapMaterialsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{
      name: string;
      code?: string;
      densityKgM3?: number;
      colorName?: string;
      colorHex?: string;
      finishType?: string;
      coatingType?: string;
      coatingSpec?: string;
      isActive: boolean;
    }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{
      name: string;
      code?: string;
      densityKgM3?: number;
      colorName?: string;
      colorHex?: string;
      finishType?: string;
      coatingType?: string;
      coatingSpec?: string;
      isActive: boolean;
    }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Название', 'Код', 'Плотность', 'Цвет', 'Финиш', 'Покрытие'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return {
        ok: false,
        rows: mapped,
        errors: [`Нет колонок: ${missingHeaders.join(', ')}`],
      };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const code = String(row['Код'] ?? '').trim();
      const density = this.parseNumberOrNull(row['Плотность']);
      const colorRaw = String(row['Цвет'] ?? '').trim();
      const finishType = String(row['Финиш'] ?? '').trim();
      const coatingType = String(row['Покрытие'] ?? '').trim();

      if (!name || !colorRaw || !finishType || !coatingType) {
        errors.push(`Строка ${rowNo}: заполните Название/Цвет/Финиш/Покрытие.`);
        return;
      }
      if (density === null || density < 0) {
        errors.push(`Строка ${rowNo}: Плотность должна быть числом >= 0.`);
        return;
      }

      const colorHexMatch = /^#([A-Fa-f0-9]{6})$/.exec(colorRaw);
      const colorHex = colorHexMatch ? (`#${colorHexMatch[1]}`.toUpperCase() as string) : undefined;
      const colorName = colorHex ? undefined : colorRaw;

      mapped.push({
        name,
        code: code || undefined,
        densityKgM3: density,
        colorHex,
        colorName,
        finishType,
        coatingType,
        coatingSpec: undefined,
        isActive: true,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapGeometriesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{
      name: string;
      shapeKey: string;
      heightMm?: number;
      lengthMm?: number;
      widthMm?: number;
      diameterMm?: number;
      thicknessMm?: number;
      notes?: string;
      isActive: boolean;
    }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{
      name: string;
      shapeKey: string;
      heightMm?: number;
      lengthMm?: number;
      widthMm?: number;
      diameterMm?: number;
      thicknessMm?: number;
      notes?: string;
      isActive: boolean;
    }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Название', 'Тип', 'Параметры'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    const allowedShapes = new Set(['rectangular', 'cylindrical', 'tube', 'plate', 'custom']);

    const extractNumber = (source: string, pattern: RegExp): number | null => {
      const match = pattern.exec(source);
      if (!match) return null;
      return this.parseNumberOrNull(match[1]);
    };

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const shapeKey = String(row['Тип'] ?? '').trim().toLowerCase();
      const paramsRaw = String(row['Параметры'] ?? '').trim();

      if (!name || !paramsRaw) {
        errors.push(`Строка ${rowNo}: заполните Название и Параметры.`);
        return;
      }
      if (!allowedShapes.has(shapeKey)) {
        errors.push(`Строка ${rowNo}: Тип должен быть одним из: ${Array.from(allowedShapes).join(', ')}.`);
        return;
      }

      const params = paramsRaw;
      const heightMm = extractNumber(params, /В\s*([0-9.,-]+)/i);
      const lengthMm = extractNumber(params, /Дл\s*([0-9.,-]+)/i);
      const widthMm = extractNumber(params, /Ш\s*([0-9.,-]+)/i);
      const diameterMm = extractNumber(params, /Диам\s*([0-9.,-]+)/i);
      const thicknessMm = extractNumber(params, /Толщ\s*([0-9.,-]+)/i);

      const extractedAny = [heightMm, lengthMm, widthMm, diameterMm, thicknessMm].some((v) => v !== null);
      if (!extractedAny) {
        errors.push(`Строка ${rowNo}: Параметры не распознаны (ожидаются числа после «В/Дл/Ш/Диам/Толщ»).`);
        return;
      }

      const requireIf = (cond: boolean, msg: string): void => {
        if (!cond) errors.push(`Строка ${rowNo}: ${msg}`);
      };

      if (shapeKey === 'rectangular') {
        requireIf(heightMm !== null, 'для rectangular нужны значения В.');
        requireIf(lengthMm !== null, 'для rectangular нужны значения Дл.');
        requireIf(widthMm !== null, 'для rectangular нужны значения Ш.');
      } else if (shapeKey === 'cylindrical') {
        requireIf(diameterMm !== null, 'для cylindrical нужны значения Диам.');
        requireIf(lengthMm !== null, 'для cylindrical нужны значения Дл.');
      } else if (shapeKey === 'tube') {
        requireIf(diameterMm !== null, 'для tube нужны значения Диам.');
        requireIf(lengthMm !== null, 'для tube нужны значения Дл.');
        requireIf(thicknessMm !== null, 'для tube нужны значения Толщ.');
      } else if (shapeKey === 'plate') {
        requireIf(lengthMm !== null, 'для plate нужны значения Дл.');
        requireIf(widthMm !== null, 'для plate нужны значения Ш.');
        requireIf(thicknessMm !== null, 'для plate нужны значения Толщ.');
      }

      if (errors.length && errors[errors.length - 1].startsWith(`Строка ${rowNo}:`)) {
        // если в этой строке накопились ошибки — не добавляем запись
        const rowErrorsCount = errors.filter((e) => e.startsWith(`Строка ${rowNo}:`)).length;
        if (rowErrorsCount) return;
      }

      const nonNegative = (v: number | null): boolean => v === null || v >= 0;
      if (![heightMm, lengthMm, widthMm, diameterMm, thicknessMm].every(nonNegative)) {
        errors.push(`Строка ${rowNo}: параметры должны быть >= 0.`);
        return;
      }

      mapped.push({
        name,
        shapeKey,
        heightMm: heightMm ?? undefined,
        lengthMm: lengthMm ?? undefined,
        widthMm: widthMm ?? undefined,
        diameterMm: diameterMm ?? undefined,
        thicknessMm: thicknessMm ?? undefined,
        notes: '',
        isActive: true,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapUnitsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ name: string; code: string; notes?: string; isActive: boolean }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ name: string; code: string; notes?: string; isActive: boolean }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Название', 'Код', 'Комментарий'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const code = String(row['Код'] ?? '').trim();
      const notes = String(row['Комментарий'] ?? '').trim();

      if (!name) {
        errors.push(`Строка ${rowNo}: Название обязательно.`);
        return;
      }
      if (!code || code.length < 2) {
        errors.push(`Строка ${rowNo}: Код должен быть строкой длиной >= 2.`);
        return;
      }

      mapped.push({ name, code, notes, isActive: true });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapSurfaceFinishesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ finishType: string; roughnessClass: string; raMicron?: number }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ finishType: string; roughnessClass: string; raMicron?: number }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Тип финиша', 'Шероховатость', 'Ra, мкм'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const finishType = String(row['Тип финиша'] ?? '').trim();
      const roughnessClass = String(row['Шероховатость'] ?? '').trim();
      const raMicron = this.parseNumberOrNull(row['Ra, мкм']);

      if (!finishType || !roughnessClass || raMicron === null) {
        errors.push(`Строка ${rowNo}: заполните Тип финиша/Шероховатость/Ra, мкм.`);
        return;
      }
      if (raMicron < 0) {
        errors.push(`Строка ${rowNo}: Ra, мкм должен быть >= 0.`);
        return;
      }

      mapped.push({ finishType, roughnessClass, raMicron });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapCoatingsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Тип покрытия', 'Спецификация', 'Толщина, мкм'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const coatingType = String(row['Тип покрытия'] ?? '').trim();
      const coatingSpec = String(row['Спецификация'] ?? '').trim();
      const thicknessMicron = this.parseNumberOrNull(row['Толщина, мкм']);

      if (!coatingType || !coatingSpec || thicknessMicron === null) {
        errors.push(`Строка ${rowNo}: заполните Тип покрытия/Спецификация/Толщина, мкм.`);
        return;
      }
      if (thicknessMicron < 0) {
        errors.push(`Строка ${rowNo}: Толщина, мкм должен быть >= 0.`);
        return;
      }

      mapped.push({ coatingType, coatingSpec, thicknessMicron });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private applyGeometryShapeValidators(shape: string): void {
    const c = this.geometriesForm.controls;
    c.heightMm.clearValidators();
    c.lengthMm.clearValidators();
    c.widthMm.clearValidators();
    c.diameterMm.clearValidators();
    c.thicknessMm.clearValidators();

    const optionalNonNegative = [Validators.min(0)];

    if (shape === 'rectangular') {
      c.heightMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.lengthMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.widthMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.thicknessMm.setValidators(optionalNonNegative);
    } else if (shape === 'cylindrical') {
      c.diameterMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.lengthMm.setValidators([Validators.required, ...optionalNonNegative]);
    } else if (shape === 'tube') {
      c.diameterMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.thicknessMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.lengthMm.setValidators([Validators.required, ...optionalNonNegative]);
    } else if (shape === 'plate') {
      c.lengthMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.widthMm.setValidators([Validators.required, ...optionalNonNegative]);
      c.thicknessMm.setValidators([Validators.required, ...optionalNonNegative]);
    } else {
      c.lengthMm.setValidators(optionalNonNegative);
      c.widthMm.setValidators(optionalNonNegative);
      c.heightMm.setValidators(optionalNonNegative);
      c.diameterMm.setValidators(optionalNonNegative);
      c.thicknessMm.setValidators(optionalNonNegative);
    }

    c.heightMm.updateValueAndValidity({ emitEvent: false });
    c.lengthMm.updateValueAndValidity({ emitEvent: false });
    c.widthMm.updateValueAndValidity({ emitEvent: false });
    c.diameterMm.updateValueAndValidity({ emitEvent: false });
    c.thicknessMm.updateValueAndValidity({ emitEvent: false });
  }
}

