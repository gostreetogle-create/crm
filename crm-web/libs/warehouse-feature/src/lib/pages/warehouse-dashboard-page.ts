import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WarehouseProduct, WarehouseSummary, WAREHOUSE_REPOSITORY, WarehouseRepository } from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-dashboard-page',
  imports: [CommonModule, RouterLink, PageShellComponent, DecimalPipe, CurrencyPipe],
  templateUrl: './warehouse-dashboard-page.html',
  styleUrl: './warehouse-dashboard-page.scss',
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
