import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  WAREHOUSE_REPOSITORY,
  WarehouseMovement,
  WarehouseRepository,
  getMovementLabel,
  toStockMovementType,
} from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-movements-page',
  imports: [CommonModule, RouterLink, PageShellComponent],
  template: `
    <app-page-shell>
      <section class="page">
        <header><h1>Журнал движений склада</h1></header>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Дата</th><th>Товар</th><th>SKU</th><th>Тип</th><th>Кол-во</th><th>Причина</th><th>Кем</th></tr></thead>
            <tbody>
              @for (item of movements(); track item.id) {
                <tr>
                  <td>{{ item.createdAt | date: 'dd.MM.yyyy HH:mm' }}</td>
                  <td><a [routerLink]="['/warehouse/products', item.productId]">{{ item.product?.name || item.productId }}</a></td>
                  <td>{{ item.product?.sku || '—' }}</td>
                  <td>{{ typeLabel(item.type) }}</td>
                  <td>{{ item.quantity | number: '1.0-2' }}</td>
                  <td>{{ item.reason || '—' }}</td>
                  <td>{{ item.createdBy || '—' }}</td>
                </tr>
              } @empty { <tr><td colspan="7">Движения не найдены</td></tr> }
            </tbody>
          </table>
        </div>
      </section>
    </app-page-shell>
  `,
  styles: [`.page{display:grid;gap:12px}.table-wrap{border:1px solid var(--border-color);border-radius:10px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;border-bottom:1px solid var(--border-color);text-align:left;font-size:13px}`],
})
export class WarehouseMovementsPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  readonly movements = signal<WarehouseMovement[]>([]);

  ngOnInit(): void {
    this.repository.getMovements().subscribe({ next: (rows) => this.movements.set(rows) });
  }

  typeLabel(type: WarehouseMovement['type']): string {
    return getMovementLabel(toStockMovementType(type));
  }
}
