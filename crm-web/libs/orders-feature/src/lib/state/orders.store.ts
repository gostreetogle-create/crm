import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'SHIPPED';
export type OrderListItem = {
  id: string;
  number: string;
  quoteId: string | null;
  clientId: string | null;
  status: OrderStatus;
  comment: string | null;
  itemsCount: number;
  createdAt: string;
};
export type BomItem = {
  id: string;
  orderItemId: string;
  warehouseProductId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string;
};
export type OrderItem = {
  id: string;
  orderId: string;
  warehouseProductId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string;
  price: number;
  bomItems: BomItem[];
};
export type OrderDetails = {
  id: string;
  number: string;
  quoteId: string | null;
  clientId: string | null;
  status: OrderStatus;
  comment: string | null;
  items: OrderItem[];
  createdAt: string;
};

@Injectable()
export class OrdersStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly loading = signal(false);
  readonly list = signal<OrderListItem[]>([]);
  readonly current = signal<OrderDetails | null>(null);

  async loadList(status = '', search = ''): Promise<void> {
    this.loading.set(true);
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search.trim()) params = params.set('search', search.trim());
    try {
      const rows = await firstValueFrom(this.http.get<OrderListItem[]>(this.endpoint('/api/orders'), { params }));
      this.list.set(Array.isArray(rows) ? rows : []);
    } finally {
      this.loading.set(false);
    }
  }

  async loadById(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const row = await firstValueFrom(this.http.get<OrderDetails>(this.endpoint(`/api/orders/${id}`)));
      this.current.set(row);
    } finally {
      this.loading.set(false);
    }
  }

  async createOrder(payload: { quoteId?: string | null } = {}): Promise<OrderDetails> {
    return await firstValueFrom(this.http.post<OrderDetails>(this.endpoint('/api/orders'), payload));
  }

  async patchOrder(id: string, patch: Partial<Pick<OrderDetails, 'status' | 'comment'>>): Promise<void> {
    await firstValueFrom(this.http.patch(this.endpoint(`/api/orders/${id}`), patch));
    await this.loadById(id);
  }

  async addItem(orderId: string, payload: Partial<OrderItem> & { name: string; quantity: number; unit: string }): Promise<void> {
    await firstValueFrom(this.http.post(this.endpoint(`/api/orders/${orderId}/items`), payload));
    await this.loadById(orderId);
  }

  async addBom(orderId: string, itemId: string, payload: { name: string; sku?: string; quantity: number; unit: string }): Promise<void> {
    await firstValueFrom(this.http.post(this.endpoint(`/api/orders/${orderId}/items/${itemId}/bom`), payload));
    await this.loadById(orderId);
  }

  async sendToSupply(orderId: string): Promise<{ created: number; skipped: number }> {
    return await firstValueFrom(
      this.http.post<{ created: number; skipped: number }>(this.endpoint(`/api/orders/${orderId}/send-to-supply`), {}),
    );
  }

  async findByQuoteId(quoteId: string): Promise<OrderListItem | null> {
    const rows = await firstValueFrom(
      this.http.get<OrderListItem[]>(this.endpoint('/api/orders'), { params: new HttpParams().set('quoteId', quoteId) }),
    );
    return rows?.[0] ?? null;
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
