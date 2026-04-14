import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WAREHOUSE_REPOSITORY, WarehouseProduct, WarehouseRepository } from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-products-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent, DecimalPipe],
  template: `
    <app-page-shell>
      <section class="page">
        <header class="toolbar">
          <h1>Товары склада</h1>
          <a routerLink="/warehouse/products/new">Добавить товар</a>
        </header>
        <div class="filters">
          <input type="text" placeholder="Поиск по SKU, названию, поставщику" [(ngModel)]="search" (ngModelChange)="reload()" />
          <select [(ngModel)]="category" (ngModelChange)="reload()">
            <option value="">Все категории</option>
            @for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }
          </select>
          <select [(ngModel)]="sortBy" (ngModelChange)="reload()">
            <option value="updatedAt">Обновление</option>
            <option value="name">Название</option>
            <option value="quantity">Остаток</option>
            <option value="price">Цена</option>
          </select>
          <select [(ngModel)]="sortDir" (ngModelChange)="reload()">
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Наименование</th><th>Категория</th><th>Остаток</th><th>Мин</th><th>Цена</th></tr></thead>
            <tbody>
              @for (item of products(); track item.id) {
                <tr [class.low]="item.isBelowMinStockLevel">
                  <td><a [routerLink]="['/warehouse/products', item.id]">{{ item.sku }}</a></td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.category }}</td>
                  <td>{{ item.quantity | number: '1.0-2' }} {{ item.unit }}</td>
                  <td>{{ item.minStockLevel | number: '1.0-2' }} {{ item.unit }}</td>
                  <td>{{ item.price | number: '1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6">Нет данных</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </app-page-shell>
  `,
  styles: [`
    .page { display: grid; gap: 12px; } .toolbar { display: flex; justify-content: space-between; align-items: center; }
    .filters { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; }
    input, select { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); }
    .table-wrap { border: 1px solid var(--border-color); border-radius: 10px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; } th, td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); text-align: left; }
    .low { background: color-mix(in srgb, #bf3e2f 8%, var(--surface)); }
  `],
})
export class WarehouseProductsPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  readonly products = signal<WarehouseProduct[]>([]);
  readonly categories = signal<string[]>([]);
  search = '';
  category = '';
  sortBy: 'name' | 'category' | 'quantity' | 'price' | 'createdAt' | 'updatedAt' = 'updatedAt';
  sortDir: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.repository
      .getProducts({
        search: this.search.trim() || undefined,
        category: this.category || undefined,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
      })
      .subscribe({
        next: (items) => {
          this.products.set(items);
          this.categories.set(Array.from(new Set(items.map((item) => item.category))).sort((a, b) => a.localeCompare(b)));
        },
      });
  }
}
