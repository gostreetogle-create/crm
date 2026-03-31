import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { FieldRow } from '@srm/shared-types';

@Component({
  selector: 'app-fields-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fields-table.component.html',
  styleUrl: './fields-table.component.scss',
})
export class FieldsTableComponent {
  @Input({ required: true }) fields!: FieldRow[];
}



