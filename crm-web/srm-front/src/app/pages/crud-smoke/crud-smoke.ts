import { Component } from '@angular/core';
import { CrudLayoutComponent, type TableColumn } from '@srm/ui-kit';

@Component({
  standalone: true,
  imports: [CrudLayoutComponent],
  templateUrl: './crud-smoke.html',
  styleUrl: './crud-smoke.scss',
})
export class CrudSmokePage {
  readonly columns: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
  ];

  readonly data: Record<string, unknown>[] = [
    { id: '1', name: 'Первая запись', code: 'A' },
    { id: '2', name: 'Вторая запись', code: 'B' },
  ];
}
