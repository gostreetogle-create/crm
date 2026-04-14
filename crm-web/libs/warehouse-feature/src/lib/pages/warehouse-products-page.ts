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
  templateUrl: './warehouse-products-page.html',
  styleUrl: './warehouse-products-page.scss',
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
