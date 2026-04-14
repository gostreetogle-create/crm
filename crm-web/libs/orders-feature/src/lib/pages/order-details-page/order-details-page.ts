import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageShellComponent, ToastService } from '@srm/ui-kit';
import { BomInlineFormComponent } from '../../components/bom-inline-form/bom-inline-form';
import { OrderItemRowComponent } from '../../components/order-item-row/order-item-row';
import { OrdersStore, OrderStatus } from '../../state/orders.store';

@Component({
  standalone: true,
  selector: 'app-order-details-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent, OrderItemRowComponent, BomInlineFormComponent],
  providers: [OrdersStore],
  templateUrl: './order-details-page.html',
  styleUrl: './order-details-page.scss',
})
export class OrderDetailsPage implements OnInit {
  readonly store = inject(OrdersStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly activeBomItem = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.store.loadById(id);
  }

  async setStatus(status: OrderStatus): Promise<void> {
    const order = this.store.current();
    if (!order) return;
    await this.store.patchOrder(order.id, { status });
  }

  async addItem(): Promise<void> {
    const order = this.store.current();
    if (!order) return;
    await this.store.addItem(order.id, { name: 'Новая позиция', quantity: 1, unit: 'шт.', price: 0 });
  }

  async addBom(itemId: string, payload: { name: string; sku?: string; quantity: number; unit: string }): Promise<void> {
    const order = this.store.current();
    if (!order) return;
    await this.store.addBom(order.id, itemId, payload);
    this.activeBomItem.set(null);
  }

  async sendToSupply(): Promise<void> {
    const order = this.store.current();
    if (!order) return;
    const result = await this.store.sendToSupply(order.id);
    this.toast.show(`Создано: ${result.created}, пропущено: ${result.skipped}`, 'success');
  }
}
