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
  templateUrl: './warehouse-product-details-page.html',
  styleUrl: './warehouse-product-details-page.scss',
})
export class WarehouseProductDetailsPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly product = signal<any | null>(null);
  readonly movements = signal<WarehouseMovement[]>([]);
  readonly returnUrl = signal<string | null>(null);
  readonly movementTypes = MOVEMENT_TYPES;
  movementType: StockMovementType = 'INCOMING';
  movementQuantity = 1;
  movementReason = '';

  ngOnInit(): void {
    this.returnUrl.set(this.readReturnUrl());
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

  private readReturnUrl(): string | null {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl')?.trim() ?? '';
    if (!raw.startsWith('/')) return null;
    return raw;
  }
}
