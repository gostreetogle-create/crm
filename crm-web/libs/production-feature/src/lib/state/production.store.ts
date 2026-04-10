import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { ProductionOrder, ProductionStatus } from '../production.types';

@Injectable()
export class ProductionStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly orders = signal<ProductionOrder[]>([]);
  readonly loading = signal(false);
  readonly filter = signal<'ALL' | ProductionStatus>('ALL');

  readonly filteredOrders = computed(() => {
    const mode = this.filter();
    const items = this.orders();
    if (mode === 'ALL') return items;
    return items.filter((o) => o.productionStatus === mode);
  });

  readonly pendingOrders = computed(() => this.filteredOrders().filter((o) => o.productionStatus === 'PENDING'));
  readonly inProgressOrders = computed(() =>
    this.filteredOrders().filter((o) => o.productionStatus === 'IN_PROGRESS'),
  );
  readonly doneOrders = computed(() => this.filteredOrders().filter((o) => o.productionStatus === 'DONE'));

  loadOrders(): void {
    this.loading.set(true);
    this.http.get<ProductionOrder[]>(this.endpoint('/api/production/orders')).subscribe({
      next: (items) => {
        this.orders.set(Array.isArray(items) ? items : []);
        this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.loading.set(false);
      },
    });
  }

  updateOrderStatus(id: string, status: ProductionStatus): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === id);
    if (!target || target.productionStatus === status) return;

    this.orders.set(
      previousOrders.map((order) =>
        order.id === id ? { ...order, productionStatus: status } : order,
      ),
    );

    this.http.put(this.endpoint(`/api/production/orders/${id}/status`), { status }).subscribe({
      error: () => this.orders.set(previousOrders),
    });
  }

  updateOrderSchedule(id: string, productionStart: string, deadline: string): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === id);
    if (!target) return;

    this.orders.set(
      previousOrders.map((order) =>
        order.id === id ? { ...order, productionStart, deadline } : order,
      ),
    );

    this.http
      .put(this.endpoint(`/api/production/orders/${id}`), {
        productionStart,
        deadline,
      })
      .subscribe({
        error: () => this.orders.set(previousOrders),
      });
  }

  progress(order: ProductionOrder): { done: number; total: number } {
    const total = order.assignments?.length ?? 0;
    const done = (order.assignments ?? []).filter((a) => a.status === 'DONE').length;
    return { done, total };
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
