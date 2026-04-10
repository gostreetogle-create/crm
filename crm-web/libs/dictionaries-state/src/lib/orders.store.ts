import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { mapOrderDeleteError, mapOrderUpdateError } from './orders-error-mapping';
import { formatRuDateOrDash, formatRuDateTimeOrDash } from './presentation-formatters';

export type OrderLineSnapshot = {
  lineNo: number;
  name: string;
  description: string | null;
  qty: number;
  unit: string;
  sortOrder?: number;
};

export type OrderItem = {
  id: string;
  commercialOfferId: string;
  orderNumber: string;
  offerNumber: string;
  customerLabel: string;
  deadline: string | null;
  notes: string;
  linesSnapshot: OrderLineSnapshot[];
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly items = signal<OrderItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editId = signal<string | null>(null);

  readonly ordersData = computed(() =>
    [...this.items()]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((item) => ({
        id: item.id,
        hubLine: `${item.orderNumber} · ${item.customerLabel}`,
        orderNumber: item.orderNumber,
        customerLabel: item.customerLabel || '—',
        deadlineLabel: formatRuDateOrDash(item.deadline),
        offerNumberLabel: item.offerNumber || '—',
        linesLabel: this.linesSummary(item.linesSnapshot),
        compositionLines: item.linesSnapshot,
        updatedAtLabel: formatRuDateTimeOrDash(item.updatedAt),
      })),
  );

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<OrderItem[]>(this.endpoint()).subscribe({
      next: (items) => {
        this.items.set(Array.isArray(items) ? items : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Не удалось загрузить заказы');
      },
    });
  }

  startEdit(id: string): void {
    this.editId.set(id);
  }

  resetForm(): void {
    this.editId.set(null);
  }

  update(id: string, payload: { orderNumber?: string; deadline?: string | null; notes?: string | null }): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.put<OrderItem>(this.endpoint(`/${id}`), payload).subscribe({
      next: () => {
        this.editId.set(null);
        this.loadItems();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(mapOrderUpdateError(err));
      },
    });
  }

  remove(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.delete(this.endpoint(`/${id}`)).subscribe({
      next: () => this.loadItems(),
      error: (err) => {
        this.loading.set(false);
        this.error.set(mapOrderDeleteError(err));
      },
    });
  }

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/orders${path}`;
  }

  private linesSummary(lines: OrderLineSnapshot[]): string {
    if (!Array.isArray(lines) || lines.length === 0) return '—';
    return lines
      .slice()
      .sort((a, b) => (a.sortOrder ?? a.lineNo) - (b.sortOrder ?? b.lineNo))
      .map((line) => `${line.name} × ${line.qty} ${line.unit}`.trim())
      .join('; ');
  }

}

