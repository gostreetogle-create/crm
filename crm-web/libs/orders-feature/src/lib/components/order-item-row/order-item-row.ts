import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OrderItem } from '../../state/orders.store';

@Component({
  standalone: true,
  selector: 'app-order-item-row',
  imports: [CommonModule],
  templateUrl: './order-item-row.html',
  styleUrl: './order-item-row.scss',
})
export class OrderItemRowComponent {
  @Input({ required: true }) item!: OrderItem;
  @Output() addBom = new EventEmitter<void>();
}
