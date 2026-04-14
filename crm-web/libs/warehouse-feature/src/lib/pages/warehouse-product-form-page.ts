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
  templateUrl: './warehouse-product-form-page.html',
  styleUrl: './warehouse-product-form-page.scss',
})
export class WarehouseProductFormPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly error = signal('');
  readonly isEditMode = signal(false);
  readonly productId = signal<string | null>(null);
  readonly returnUrl = signal<string | null>(null);
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
    this.returnUrl.set(this.readReturnUrl());
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
        next: (updated) => this.navigateAfterSave(updated.id),
        error: () => this.error.set('Не удалось обновить товар. Проверьте SKU и обязательные поля.'),
      });
      return;
    }

    this.repository.createProduct(payload).subscribe({
      next: (created) => this.navigateAfterSave(created.id),
      error: () => this.error.set('Не удалось создать товар. Проверьте SKU и обязательные поля.'),
    });
  }

  cancelLink(): string {
    const returnUrl = this.returnUrl();
    if (returnUrl) return returnUrl;
    const id = this.productId();
    if (id) return `/warehouse/products/${id}`;
    return '/warehouse/products';
  }

  private navigateAfterSave(productId: string): void {
    const returnUrl = this.returnUrl();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    this.router.navigate(['/warehouse/products', productId]);
  }

  private readReturnUrl(): string | null {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl')?.trim() ?? '';
    if (!raw.startsWith('/')) return null;
    return raw;
  }
}
