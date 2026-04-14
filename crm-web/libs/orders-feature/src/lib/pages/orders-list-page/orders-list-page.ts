import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PageShellComponent } from '@srm/ui-kit';
import { OrdersStore, OrderStatus } from '../../state/orders.store';

@Component({
  standalone: true,
  selector: 'app-orders-list-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent],
  providers: [OrdersStore],
  templateUrl: './orders-list-page.html',
  styleUrl: './orders-list-page.scss',
})
export class OrdersListPage implements OnInit {
  readonly store = inject(OrdersStore);
  private readonly router = inject(Router);

  search = '';
  status: '' | OrderStatus = '';

  ngOnInit(): void {
    void this.store.loadList();
  }

  async applyFilters(): Promise<void> {
    await this.store.loadList(this.status, this.search);
  }

  async createOrder(): Promise<void> {
    const order = await this.store.createOrder();
    await this.router.navigate(['/orders', order.id]);
  }

  statusLabel(status: OrderStatus): string {
    return (
      {
        NEW: 'Новый',
        CONFIRMED: 'Подтвержден',
        IN_PROGRESS: 'В работе',
        DONE: 'Готов',
        SHIPPED: 'Отгружен',
      }[status] ?? status
    );
  }

  statusClass(status: OrderStatus): string {
    return `status status--${status.toLowerCase()}`;
  }
}
