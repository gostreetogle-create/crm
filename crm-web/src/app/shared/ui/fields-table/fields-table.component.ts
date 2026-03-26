import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FieldRow } from '../../model/field-row';

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

