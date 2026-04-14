import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_CONFIG } from '@srm/platform-core';
import { PageShellComponent, ToastService } from '@srm/ui-kit';

type SupplyStatus = 'OPEN' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
type SupplyItemStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

type SupplyDetails = {
  id: string;
  status: SupplyStatus;
  order: { id: string; orderNumber: string; customerLabel: string };
  items: Array<{
    id: string;
    productName: string;
    sku: string | null;
    warehouseProductId?: string | null;
    qty: number;
    unit: string;
    receivedQty: number;
    status: SupplyItemStatus;
  }>;
};

@Component({
  standalone: true,
  selector: 'app-supply-details-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent],
  template: `
    <app-page-shell>
      <section class="page">
        @if (details(); as details) {
          <header class="toolbar">
            <div>
              <h1>Снабжение · {{ details.order.orderNumber }}</h1>
              <p>Клиент: {{ details.order.customerLabel }}</p>
            </div>
            <div class="status">{{ requestStatusLabel(details.status) }}</div>
          </header>

          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>SKU</th>
                  <th>Нужно</th>
                  <th>Получено</th>
                  <th>Статус</th>
                  <th>Поступление</th>
                  <th>Товар</th>
                </tr>
              </thead>
              <tbody>
                @for (item of details.items; track item.id) {
                  <tr>
                    <td>{{ item.productName }}</td>
                    <td>{{ item.sku || '—' }}</td>
                    <td>{{ item.qty }} {{ item.unit }}</td>
                    <td>{{ item.receivedQty }} {{ item.unit }}</td>
                    <td>{{ itemStatusLabel(item.status) }}</td>
                    <td>
                      @if (item.status === 'PENDING' || item.status === 'PARTIAL') {
                        <div class="receiveControls">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            [ngModel]="receiveDrafts()[item.id]"
                            (ngModelChange)="setDraft(item.id, $event)"
                          />
                          <button type="button" (click)="receive(item.id)">Поступило</button>
                        </div>
                      } @else {
                        —
                      }
                    </td>
                    <td>
                      @if (item.warehouseProductId) {
                        <a
                          class="linkBtn"
                          [routerLink]="['/warehouse/products', item.warehouseProductId, 'edit']"
                          [queryParams]="{ returnUrl: '/снабжение/' + details.id }"
                        >
                          Редактировать
                        </a>
                      } @else {
                        <span class="mutedHint">Не связан</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p>Загрузка...</p>
        }
      </section>
    </app-page-shell>
  `,
  styles: [`
    .page { display: grid; gap: 12px; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .toolbar p { margin: 0; color: var(--text-muted); }
    .status { font-weight: 600; }
    .tableWrap { border: 1px solid var(--border-color); border-radius: 10px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); text-align: left; }
    .receiveControls { display: flex; gap: 8px; }
    input { width: 120px; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 8px; background: var(--surface); }
    button { border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); padding: 6px 10px; cursor: pointer; }
    .linkBtn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--surface);
      padding: 6px 10px;
      text-decoration: none;
      color: var(--text-primary);
      font-size: 12px;
      line-height: 1;
    }
    .mutedHint { color: var(--text-muted); font-size: 12px; }
  `],
})
export class SupplyDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly toast = inject(ToastService);

  readonly details = signal<SupplyDetails | null>(null);
  readonly receiveDrafts = signal<Record<string, number>>({});

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.http.get<SupplyDetails>(this.endpoint(`/api/supply/${id}`)).subscribe({
      next: (row) => this.details.set(row),
      error: () => this.details.set(null),
    });
  }

  setDraft(itemId: string, raw: unknown): void {
    const qty = Number(raw);
    this.receiveDrafts.update((prev) => ({ ...prev, [itemId]: Number.isFinite(qty) ? qty : 0 }));
  }

  receive(supplyItemId: string): void {
    const details = this.details();
    if (!details) return;
    const qty = Number(this.receiveDrafts()[supplyItemId] ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) return;
    this.http
      .post(this.endpoint(`/api/supply/${details.id}/receive`), {
        items: [{ supplyItemId, qty }],
      })
      .subscribe({
        next: () => this.load(),
        error: (err: unknown) => {
          const payload =
            typeof err === 'object' && err !== null && 'error' in err
              ? (err as { error?: unknown }).error
              : null;
          const code =
            payload && typeof payload === 'object' && 'error' in payload
              ? String((payload as { error?: unknown }).error ?? '')
              : '';
          if (code === 'warehouse_product_not_found') {
            this.toast.show('Товар не найден на складе. Проверьте SKU/название.', 'error');
            return;
          }
          this.toast.show('Не удалось провести поступление', 'error');
        },
      });
  }

  requestStatusLabel(status: SupplyStatus): string {
    if (status === 'PARTIAL') return 'Частично получена';
    if (status === 'RECEIVED') return 'Получена';
    if (status === 'CANCELLED') return 'Отменена';
    return 'Открыта';
  }

  itemStatusLabel(status: SupplyItemStatus): string {
    if (status === 'PARTIAL') return 'Частично';
    if (status === 'RECEIVED') return 'Получено';
    return 'Ожидает';
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
