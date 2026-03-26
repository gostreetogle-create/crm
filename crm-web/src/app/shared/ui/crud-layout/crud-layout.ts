import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { PageHeaderComponent } from '../page-header/page-header.component';

export type TableColumn = {
  key: string;
  label: string;
};

@Component({
  selector: 'crud-layout',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './crud-layout.html',
  styleUrl: './crud-layout.scss',
})
export class CrudLayoutComponent {
  @Input({ required: true }) columns: TableColumn[] = [];
  @Input({ required: true }) data: any[] = [];
  @Input() toolbarActions: TemplateRef<unknown> | null = null;
  @Input() formActions: TemplateRef<unknown> | null = null;
  @Input({ required: true }) title!: string;
  @Input() showRowActions = true;
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  onEdit(row: any): void {
    if (!row?.id) return;
    this.edit.emit(String(row.id));
  }

  onDelete(row: any): void {
    if (!row?.id) return;
    this.delete.emit(String(row.id));
  }
}
