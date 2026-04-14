import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WAREHOUSE_REPOSITORY, WarehouseProductInput, WarehouseRepository, WarehouseUnit } from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-product-form-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent],
  template: `
    <app-page-shell>
      <section class="page">
        <header><h1>{{ isEditMode() ? 'Редактирование товара' : 'Новый товар' }}</h1></header>
        <form class="form-grid" (ngSubmit)="submit()">
          <input placeholder="Наименование" [(ngModel)]="model.name" name="name" required />
          <input placeholder="SKU" [(ngModel)]="model.sku" name="sku" required />
          <input placeholder="Категория" [(ngModel)]="model.category" name="category" required />
          <input type="number" step="0.01" min="0" placeholder="Остаток" [(ngModel)]="model.quantity" name="quantity" required />
          <select [(ngModel)]="model.unit" name="unit" required>
            @for (unit of units; track unit) { <option [value]="unit">{{ unit }}</option> }
          </select>
          <input type="number" step="0.01" min="0" placeholder="Минимальный остаток" [(ngModel)]="model.minStockLevel" name="minStockLevel" required />
          <input type="number" step="0.01" min="0" placeholder="Цена" [(ngModel)]="model.price" name="price" required />
          <input placeholder="Поставщик" [(ngModel)]="model.supplierName" name="supplierName" />
          <input placeholder="Локация на складе" [(ngModel)]="model.warehouseLocation" name="warehouseLocation" />
          <div class="actions">
            <button type="submit">{{ isEditMode() ? 'Сохранить изменения' : 'Сохранить' }}</button>
            <a [routerLink]="cancelLink()">Отмена</a>
          </div>
        </form>
        @if (error()) { <p class="error">{{ error() }}</p> }
      </section>
    </app-page-shell>
  `,
  styles: [`
    .page { display: grid; gap: 12px; } .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    input, select, button { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); }
    .actions { display: flex; gap: 10px; align-items: center; } .error { color: #bf3e2f; margin: 0; }
  `],
})
export class WarehouseProductFormPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly error = signal('');
  readonly isEditMode = signal(false);
  readonly productId = signal<string | null>(null);
  readonly units: WarehouseUnit[] = ['шт', 'кг', 'л'];
  model: WarehouseProductInput = {
    name: '',
    sku: '',
    category: '',
    quantity: 0,
    unit: 'шт',
    minStockLevel: 0,
    price: 0,
    supplierName: null,
    warehouseLocation: null,
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isEditMode.set(true);
    this.productId.set(id);
    this.repository.getProductById(id).subscribe({
      next: (product) => {
        this.model = {
          name: product.name,
          sku: product.sku,
          category: product.category,
          quantity: product.quantity,
          unit: product.unit,
          minStockLevel: product.minStockLevel,
          price: product.price,
          supplierName: product.supplierName,
          warehouseLocation: product.warehouseLocation,
        };
      },
      error: () => this.error.set('Не удалось загрузить товар для редактирования.'),
    });
  }

  submit(): void {
    this.error.set('');
    const payload = {
      ...this.model,
      supplierName: this.model.supplierName?.trim() || null,
      warehouseLocation: this.model.warehouseLocation?.trim() || null,
    };

    const id = this.productId();
    if (this.isEditMode() && id) {
      this.repository.updateProduct(id, payload).subscribe({
        next: (updated) => this.router.navigate(['/warehouse/products', updated.id]),
        error: () => this.error.set('Не удалось обновить товар. Проверьте SKU и обязательные поля.'),
      });
      return;
    }

    this.repository.createProduct(payload).subscribe({
      next: (created) => this.router.navigate(['/warehouse/products', created.id]),
      error: () => this.error.set('Не удалось создать товар. Проверьте SKU и обязательные поля.'),
    });
  }

  cancelLink(): string {
    const id = this.productId();
    if (id) return `/warehouse/products/${id}`;
    return '/warehouse/products';
  }
}
