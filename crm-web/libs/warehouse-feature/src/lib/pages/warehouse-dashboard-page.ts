import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WarehouseProduct, WarehouseSummary, WAREHOUSE_REPOSITORY, WarehouseRepository } from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-dashboard-page',
  imports: [CommonModule, RouterLink, PageShellComponent, DecimalPipe, CurrencyPipe],
  template: `
    <app-page-shell>
      <section class="warehouse-page">
        <header class="warehouse-head">
          <h1>Склад</h1>
          <nav class="warehouse-nav">
            <a routerLink="/warehouse/products">Товары</a>
            <a routerLink="/warehouse/movements">Движения</a>
            <a routerLink="/warehouse/products/new">Добавить товар</a>
          </nav>
        </header>

        <div class="summary-grid">
          <article class="summary-card">
            <div class="label">Позиций</div>
            <div class="value">{{ summary()?.totalProducts ?? 0 }}</div>
          </article>
          <article class="summary-card">
            <div class="label">На исходе</div>
            <div class="value warn">{{ summary()?.lowStockCount ?? 0 }}</div>
          </article>
          <article class="summary-card">
            <div class="label">Доля на исходе</div>
            <div class="value">
              {{ (summary()?.totalProducts ?? 0) > 0 ? ((summary()?.lowStockCount ?? 0) / (summary()?.totalProducts ?? 1) * 100 | number: '1.0-1') + '%' : '0%' }}
            </div>
          </article>
          <article class="summary-card">
            <div class="label">Стоимость склада</div>
            <div class="value">{{ summary()?.totalValue ?? 0 | currency: 'RUB' : 'symbol' : '1.0-2' }}</div>
          </article>
        </div>

        <section class="table-wrap">
          <h2>Товары на исходе</h2>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Наименование</th>
                <th>Категория</th>
                <th>Остаток</th>
                <th>Мин. остаток</th>
                <th>Локация</th>
              </tr>
            </thead>
            <tbody>
              @for (item of lowStockProducts(); track item.id) {
                <tr>
                  <td><a [routerLink]="['/warehouse/products', item.id]">{{ item.sku }}</a></td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.category }}</td>
                  <td>{{ item.quantity | number: '1.0-2' }} {{ item.unit }}</td>
                  <td>{{ item.minStockLevel | number: '1.0-2' }} {{ item.unit }}</td>
                  <td>{{ item.warehouseLocation || '—' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">Нет позиций ниже минимального остатка.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </section>
    </app-page-shell>
  `,
  styles: [`
    .warehouse-page { display: grid; gap: 16px; }
    .warehouse-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .warehouse-nav { display: flex; gap: 12px; font-size: 13px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .summary-card { border: 1px solid var(--border-color); border-radius: 10px; padding: 12px; background: var(--surface); }
    .label { color: var(--text-muted); font-size: 12px; }
    .value { margin-top: 6px; font-size: 20px; font-weight: 600; }
    .warn { color: #bf3e2f; }
    .table-wrap { border: 1px solid var(--border-color); border-radius: 10px; overflow: auto; }
    h2 { margin: 0; padding: 12px; border-bottom: 1px solid var(--border-color); font-size: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 12px; border-bottom: 1px solid var(--border-color); text-align: left; }
    th { color: var(--text-muted); font-weight: 600; }
    @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `],
})
export class WarehouseDashboardPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  readonly summary = signal<WarehouseSummary | null>(null);
  readonly lowStockProducts = signal<WarehouseProduct[]>([]);

  ngOnInit(): void {
    this.repository.getSummary().subscribe({ next: (data) => this.summary.set(data) });
    this.repository.getProducts().subscribe({
      next: (items) => this.lowStockProducts.set(items.filter((item) => item.isBelowMinStockLevel)),
    });
  }
}
