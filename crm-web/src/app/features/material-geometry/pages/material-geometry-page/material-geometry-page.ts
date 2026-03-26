import { NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { debounceTime, distinctUntilChanged, pipe, tap } from 'rxjs';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import {
  FilterOption,
  FiltersBarComponent,
} from '../../../../shared/ui/filters-bar/filters-bar.component';
import { FieldsTableComponent } from '../../../../shared/ui/fields-table/fields-table.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import type { FieldRow } from '../../../../shared/model/field-row';
import type { FactRow } from '../../../../shared/ui/page-header/page-header.component';
import {
  MATERIAL_GEOMETRY_REPOSITORY,
  MaterialGeometryRepository,
} from '../../data/material-geometry.repository';
import { API_CONFIG } from '../../../../core/api/api-config';
import { MaterialGeometryMockRepository } from '../../data/material-geometry.mock-repository';
import { MaterialGeometryHttpRepository } from '../../data/material-geometry.http-repository';

@Component({
  selector: 'app-material-geometry-page',
  standalone: true,
  imports: [
    NgIf,
    PageShellComponent,
    PageHeaderComponent,
    ContentCardComponent,
    FiltersBarComponent,
    FieldsTableComponent,
  ],
  providers: [
    MaterialGeometryMockRepository,
    MaterialGeometryHttpRepository,
    {
      provide: MATERIAL_GEOMETRY_REPOSITORY,
      useFactory: () => {
        const config = inject(API_CONFIG);
        return config.useMockRepositories
          ? inject(MaterialGeometryMockRepository)
          : inject(MaterialGeometryHttpRepository);
      },
    },
  ],
  templateUrl: './material-geometry-page.html',
})
export class MaterialGeometryPage {
  readonly sortOptions: FilterOption[] = [
    { value: 'name', label: 'Сортировка: name' },
    { value: 'required', label: 'Сортировка: required' },
    { value: 'type', label: 'Сортировка: type' },
  ];

  readonly filterOptions: FilterOption[] = [
    { value: 'all', label: 'Показывать: все' },
    { value: 'material', label: 'Показывать: material' },
    { value: 'geometry', label: 'Показывать: geometry' },
  ];

  private readonly repository = inject<MaterialGeometryRepository>(MATERIAL_GEOMETRY_REPOSITORY);

  readonly searchTerm = signal('');
  readonly sortBy = signal<'name' | 'required' | 'type'>('name');
  readonly filterType = signal<'all' | 'material' | 'geometry'>('all');

  readonly model = toSignal(this.repository.getModel(), {
    initialValue: {
      version: '',
      materialFields: [],
      geometryFields: [],
    },
  });

  readonly applySearch = rxMethod<string>(
    pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap((term) => this.searchTerm.set(term))
    )
  );

  readonly vm = computed(() => {
    const model = this.model();
    const term = this.searchTerm().trim().toLowerCase();
    const sortBy = this.sortBy();
    const filterType = this.filterType();

    const filterRows = (rows: FieldRow[]) => {
      const filtered = rows.filter((row) => {
        if (!term) return true;
        return (
          row.key.toLowerCase().includes(term) ||
          row.label.toLowerCase().includes(term) ||
          row.type.toLowerCase().includes(term) ||
          (row.comment ?? '').toLowerCase().includes(term)
        );
      });

      return [...filtered].sort((a, b) => {
        if (sortBy === 'required') return Number(b.required) - Number(a.required);
        if (sortBy === 'type') return a.type.localeCompare(b.type);
        return a.label.localeCompare(b.label);
      });
    };

    const materialFields = filterType === 'geometry' ? [] : filterRows(model.materialFields);
    const geometryFields = filterType === 'material' ? [] : filterRows(model.geometryFields);

    const facts: FactRow[] = [
      { label: 'Версия модели', value: model.version || '—' },
      { label: 'Единицы geometry', value: 'мм', code: '*Mm' },
      { label: 'Вес (будущее)', value: 'densityKgM3' },
      { label: 'Полей material', value: String(materialFields.length) },
      { label: 'Полей geometry', value: String(geometryFields.length) },
    ];

    return {
      model,
      materialFields,
      geometryFields,
      facts,
      stats: {
        totalMaterials: materialFields.length,
        totalGeometries: geometryFields.length,
      },
    };
  });

  onSearch(term: string): void {
    this.applySearch(term);
  }

  onSortChange(value: 'name' | 'required' | 'type'): void {
    this.sortBy.set(value);
  }

  onFilterTypeChange(type: 'all' | 'material' | 'geometry'): void {
    this.filterType.set(type);
  }
}

