import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  MOVEMENT_TYPES,
  WAREHOUSE_REPOSITORY,
  WarehouseMovement,
  WarehouseRepository,
  fromStockMovementType,
  getMovementLabel,
  toStockMovementType,
  type StockMovementType,
} from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-product-details-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent, DecimalPipe],
  template: `
    <app-page-shell>
      <section class="page">
        <h1>Карточка товара</h1>
        @if (product()) {
          <div class="card">
            <p><strong>{{ product()!.name }}</strong> ({{ product()!.sku }})</p>
            <p>Категория: {{ product()!.category }}</p>
            <p>Остаток: {{ product()!.quantity | number: '1.0-2' }} {{ product()!.unit }}</p>
            <p>Минимум: {{ product()!.minStockLevel | number: '1.0-2' }} {{ product()!.unit }}</p>
            <p><a [routerLink]="['/warehouse/products', product()!.id, 'edit']">Редактировать</a></p>
          </div>
          <form class="movement" (ngSubmit)="createMovement()">
            <select [(ngModel)]="movementType" name="type">
              @for (item of movementTypes; track item.value) {
                <option [ngValue]="item.value">{{ item.label }}</option>
              }
            </select>
            <input type="number" min="0.01" step="0.01" [(ngModel)]="movementQuantity" name="quantity" />
            <input type="text" placeholder="Причина" [(ngModel)]="movementReason" name="reason" />
            <button type="submit">Провести движение</button>
          </form>
          <section class="table-wrap">
            <h2>История движений</h2>
            <table>
              <thead><tr><th>Дата</th><th>Тип</th><th>Кол-во</th><th>Причина</th><th>Кем</th></tr></thead>
              <tbody>
                @for (row of movements(); track row.id) {
                  <tr>
                    <td>{{ row.createdAt | date: 'dd.MM.yyyy HH:mm' }}</td>
                    <td>{{ typeLabel(row.type) }}</td>
                    <td>{{ row.quantity | number: '1.0-2' }}</td>
                    <td>{{ row.reason || '—' }}</td>
                    <td>{{ row.createdBy || '—' }}</td>
                  </tr>
                } @empty { <tr><td colspan="5">Движений пока нет</td></tr> }
              </tbody>
            </table>
          </section>
        }
      </section>
    </app-page-shell>
  `,
  styles: [`.page{display:grid;gap:12px}.card,.movement,.table-wrap{border:1px solid var(--border-color);border-radius:10px;padding:12px}.movement{display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:8px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid var(--border-color);text-align:left}`],
})
export class WarehouseProductDetailsPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly product = signal<any | null>(null);
  readonly movements = signal<WarehouseMovement[]>([]);
  readonly movementTypes = MOVEMENT_TYPES;
  movementType: StockMovementType = 'INCOMING';
  movementQuantity = 1;
  movementReason = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/warehouse/products']);
      return;
    }
    this.repository.getProductById(id).subscribe({ next: (data) => this.product.set(data) });
    this.repository.getMovements().subscribe({
      next: (rows) => this.movements.set(rows.filter((row) => row.productId === id)),
    });
  }

  createMovement(): void {
    const row = this.product();
    if (!row || this.movementQuantity <= 0) return;
    this.repository
      .createMovement({
        productId: row.id,
        type: fromStockMovementType(this.movementType),
        quantity: Number(this.movementQuantity),
        reason: this.movementReason.trim() || null,
      })
      .subscribe({
        next: () => {
          this.repository.getProductById(row.id).subscribe({ next: (data) => this.product.set(data) });
          this.repository.getMovements().subscribe({
            next: (rows) => this.movements.set(rows.filter((item) => item.productId === row.id)),
          });
          this.movementReason = '';
        },
      });
  }

  typeLabel(type: WarehouseMovement['type']): string {
    return getMovementLabel(toStockMovementType(type));
  }
}
