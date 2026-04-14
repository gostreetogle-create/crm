import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-bom-inline-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './bom-inline-form.html',
  styleUrl: './bom-inline-form.scss',
})
export class BomInlineFormComponent {
  name = '';
  sku = '';
  quantity = 1;
  unit = 'шт.';
  @Output() save = new EventEmitter<{ name: string; sku?: string; quantity: number; unit: string }>();

  submit(): void {
    const name = this.name.trim();
    if (!name || this.quantity <= 0) return;
    this.save.emit({ name, sku: this.sku.trim() || undefined, quantity: this.quantity, unit: this.unit.trim() || 'шт.' });
    this.name = '';
    this.sku = '';
    this.quantity = 1;
    this.unit = 'шт.';
  }
}
