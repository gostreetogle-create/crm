import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { API_CONFIG } from '@srm/platform-core';
import { PageShellComponent } from '@srm/ui-kit';

type SupplyStatus = 'OPEN' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

type SupplyListItem = {
  id: string;
  status: SupplyStatus;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    customerLabel: string;
    createdAt: string;
  };
  totals: {
    items: number;
    requiredQty: number;
    receivedQty: number;
    receivedItems: number;
  };
};

@Component({
  standalone: true,
  selector: 'app-supply-list-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent],
  template: `
    <app-page-shell>
      <section class="page">
        <header class="toolbar">
          <h1>Снабжение</h1>
          <select [(ngModel)]="statusFilter" (ngModelChange)="load()">
            <option value="">Все статусы</option>
            <option value="OPEN">Открыта</option>
            <option value="PARTIAL">Частично получена</option>
            <option value="RECEIVED">Получена</option>
            <option value="CANCELLED">Отменена</option>
          </select>
        </header>
        <div class="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Клиент</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Позиции / получено</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.id) {
                <tr>
                  <td><a [routerLink]="['/снабжение', row.id]">{{ row.order.orderNumber }}</a></td>
                  <td>{{ row.order.customerLabel }}</td>
                  <td>{{ row.createdAt | date: 'dd.MM.yyyy HH:mm' }}</td>
                  <td>{{ statusLabel(row.status) }}</td>
                  <td>{{ row.totals.receivedItems }} / {{ row.totals.items }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5">Заявок пока нет</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </app-page-shell>
  `,
  styles: [`
    .page { display: grid; gap: 12px; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    select { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; background: var(--surface); }
    .tableWrap { border: 1px solid var(--border-color); border-radius: 10px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); text-align: left; }
  `],
})
export class SupplyListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly items = signal<SupplyListItem[]>([]);
  statusFilter: '' | SupplyStatus = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    let params = new HttpParams();
    if (this.statusFilter) {
      params = params.set('status', this.statusFilter);
    }
    this.http.get<SupplyListItem[]>(this.endpoint('/api/supply'), { params }).subscribe({
      next: (rows) => this.items.set(Array.isArray(rows) ? rows : []),
      error: () => this.items.set([]),
    });
  }

  statusLabel(status: SupplyStatus): string {
    if (status === 'PARTIAL') return 'Частично получена';
    if (status === 'RECEIVED') return 'Получена';
    if (status === 'CANCELLED') return 'Отменена';
    return 'Открыта';
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
