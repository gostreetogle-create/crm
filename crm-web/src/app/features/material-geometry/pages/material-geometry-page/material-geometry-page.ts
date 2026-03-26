import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { map } from 'rxjs';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { FieldsTableComponent } from '../../../../shared/ui/fields-table/fields-table.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import type { FactRow } from '../../../../shared/ui/page-header/page-header.component';
import {
  MATERIAL_GEOMETRY_REPOSITORY,
  MaterialGeometryRepository,
} from '../../data/material-geometry.repository';

@Component({
  selector: 'app-material-geometry-page',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    PageShellComponent,
    PageHeaderComponent,
    ContentCardComponent,
    FieldsTableComponent,
  ],
  templateUrl: './material-geometry-page.html',
})
export class MaterialGeometryPage {
  private readonly repository = inject<MaterialGeometryRepository>(MATERIAL_GEOMETRY_REPOSITORY);

  readonly model$ = this.repository.getModel();
  readonly facts$ = this.model$.pipe(
    map((m): FactRow[] => [
      { label: 'Версия модели', value: m.version },
      { label: 'Единицы geometry', value: 'мм', code: '*Mm' },
      { label: 'Вес (будущее)', value: 'densityKgM3' },
    ])
  );
}

