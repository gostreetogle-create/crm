import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { LucideShoppingCart, LucideStar } from '@lucide/angular';
import {
  FiltersBarComponent,
  ProductCardComponent,
  type FilterOption,
  UiButtonComponent,
  UiPaginationComponent,
} from '@srm/ui-kit';
import { KP_CATALOG_DEMO_PRODUCTS } from './kp-catalog-demo-products';
import type { KpCatalogProduct } from './kp-catalog-product.model';
import {
  calcKpCatalogProductPageCount,
  filterSortProductsForVitrine,
  formatKpCatalogPriceRuble,
  picsumImageUrl,
  sliceKpCatalogVisibleProducts,
  tryParseKpCatalogPageSize,
  type KpCatalogProductSort,
} from '../kp-utils';

@Component({
  selector: 'app-kp-catalog-vitrine',
  standalone: true,
  imports: [
    FiltersBarComponent,
    ProductCardComponent,
    UiButtonComponent,
    UiPaginationComponent,
    LucideShoppingCart,
    LucideStar,
  ],
  templateUrl: './kp-catalog-vitrine.component.html',
  styleUrl: './kp-catalog-vitrine.component.scss',
})
export class KpCatalogVitrineComponent {
  /**
   * Список из каталога. Не задан — демо из `kp-catalog-demo-products.ts`.
   * Пустой массив — пустая витрина. Пример: `[catalogProducts]="productsFromApi()"`.
   */
  @Input() set catalogProducts(value: readonly KpCatalogProduct[] | null | undefined) {
    if (value === undefined) {
      this.productsInternal.set([...KP_CATALOG_DEMO_PRODUCTS]);
      return;
    }
    this.productsInternal.set(value ? [...value] : []);
  }

  private readonly productsInternal = signal<KpCatalogProduct[]>([...KP_CATALOG_DEMO_PRODUCTS]);

  readonly productSearch = signal('');
  readonly productSort = signal<KpCatalogProductSort>('priceDesc');
  readonly productCategory = signal<'all' | string>('all');
  readonly productPage = signal(1);
  /** Карточек на странице витрины (по умолчанию). */
  readonly productPageSize = signal(12);

  /** Варианты размера страницы для селектора «На странице». */
  readonly pageSizeOptions: readonly number[] = [12, 18, 24, 36, 48];

  @Output() readonly addToKp = new EventEmitter<KpCatalogProduct>();

  readonly productCategoryOptions = computed<FilterOption[]>(() => {
    const categories = Array.from(new Set(this.productsInternal().map((p) => p.category))).sort((a, b) =>
      a.localeCompare(b),
    );
    return [{ value: 'all', label: 'Категория: все' }].concat(
      categories.map((c) => ({ value: c, label: `Категория: ${c}` })),
    );
  });

  readonly productSortOptions: FilterOption[] = [
    { value: 'priceDesc', label: 'Сортировка: цена ↓' },
    { value: 'priceAsc', label: 'Сортировка: цена ↑' },
  ];

  readonly filteredProducts = computed(() => {
    return filterSortProductsForVitrine(
      this.productsInternal(),
      this.productSearch(),
      this.productCategory(),
      this.productSort(),
    );
  });

  readonly productPageCount = computed(() =>
    calcKpCatalogProductPageCount(this.filteredProducts().length, this.productPageSize()),
  );

  readonly visibleProducts = computed(() => {
    return sliceKpCatalogVisibleProducts(this.filteredProducts(), this.productPage(), this.productPageSize());
  });

  onProductSearch(value: string): void {
    this.productSearch.set(value);
    this.productPage.set(1);
  }

  onProductSortChange(value: string): void {
    if (value === 'priceAsc' || value === 'priceDesc') {
      this.productSort.set(value);
      this.productPage.set(1);
    }
  }

  onProductCategory(value: string): void {
    this.productCategory.set(value || 'all');
    this.productPage.set(1);
  }

  onProductPageChange(page: number): void {
    this.productPage.set(page);
  }

  onProductPageSizeChange(value: string): void {
    const n = tryParseKpCatalogPageSize(value);
    if (n == null) return;
    this.productPageSize.set(n);
    this.productPage.set(1);
  }

  onAddToKp(p: KpCatalogProduct): void {
    this.addToKp.emit(p);
  }

  formatPrice(rub: number): string {
    return formatKpCatalogPriceRuble(rub);
  }

  imageUrl(p: KpCatalogProduct): string {
    return picsumImageUrl(p.imageSeed, 640, 640);
  }
}
