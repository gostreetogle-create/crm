import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideCopy, LucideEye, LucideMoreHorizontal, LucidePencil, LucideTrash2 } from '@lucide/angular';

/** Совместимо с `CrudTableRow` из `crud-layout` (избегаем циклического импорта). */
export type CrudRowActionsRow = Record<string, unknown>;

@Component({
  selector: 'app-crud-row-actions-menu',
  standalone: true,
  imports: [LucideCopy, LucideEye, LucideMoreHorizontal, LucidePencil, LucideTrash2],
  templateUrl: './crud-row-actions-menu.component.html',
  styleUrl: './crud-row-actions-menu.component.scss',
})
export class CrudRowActionsMenuComponent {
  /** Таблица или блок карточки — влияет на растягивание корня и панели. */
  @Input() variant: 'table' | 'card' = 'table';
  @Input({ required: true }) row!: CrudRowActionsRow;
  /** Индекс строки для `data-testid` и логики открытия в родителе. */
  @Input({ required: true }) rowIndex!: number;
  @Input() isOpen = false;
  @Input() canView = true;
  @Input() canEdit = true;
  @Input() canDuplicate = true;
  @Input() canDelete = true;

  @Output() toggle = new EventEmitter<MouseEvent>();
  @Output() view = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  get trackKey(): string {
    const id = this.row['id'];
    return String(id ?? this.rowIndex);
  }

  onToggle(event: MouseEvent): void {
    this.toggle.emit(event);
  }

  emitView(): void {
    this.view.emit();
  }

  emitEdit(): void {
    this.edit.emit();
  }

  emitDuplicate(): void {
    this.duplicate.emit();
  }

  emitDelete(): void {
    this.delete.emit();
  }
}
