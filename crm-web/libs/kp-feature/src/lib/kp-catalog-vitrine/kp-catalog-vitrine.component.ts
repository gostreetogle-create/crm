import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { LucidePencil, LucideShoppingCart } from '@lucide/angular';
import {
  FiltersBarComponent,
  ProductCardComponent,
  type FilterOption,
  UiButtonComponent,
  UiPaginationComponent,
} from '@srm/ui-kit';
import type { KpCatalogProduct } from './kp-catalog-product.model';
import {
  KP_CATALOG_SUBCATEGORY_NONE_VALUE,
  calcKpCatalogProductPageCount,
  filterSortProductsForVitrine,
  formatKpCatalogCardMetaLine,
  formatKpCatalogPriceRuble,
  kpCatalogSubcategoryText,
  normalizeKpImageSrcForDisplay,
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
    LucidePencil,
    LucideShoppingCart,
  ],
  templateUrl: './kp-catalog-vitrine.component.html',
  styleUrl: './kp-catalog-vitrine.component.scss',
})
export class KpCatalogVitrineComponent {
  readonly catalogViewMode = signal<'cards' | 'table'>('cards');

  /**
   * Список из каталога.
   * Не задан или пустой — пустая витрина (без demo-данных).
   */
  @Input() set catalogProducts(value: readonly KpCatalogProduct[] | null | undefined) {
    this.productsInternal.set(value ? [...value] : []);
  }

  private readonly productsInternal = signal<KpCatalogProduct[]>([]);

  readonly productSearch = signal('');
  readonly productSort = signal<KpCatalogProductSort>('priceDesc');
  readonly productKind = signal<'all' | 'ITEM' | 'COMPLEX'>('all');
  readonly productCategory = signal<'all' | string>('all');
  readonly productSubcategory = signal<string>('all');
  readonly productPage = signal(1);
  /** Карточек на странице витрины (по умолчанию). */
  readonly productPageSize = signal(12);

  /** Варианты размера страницы для селектора «На странице». */
  readonly pageSizeOptions: readonly number[] = [12, 18, 24, 36, 48];

  @Output() readonly addToKp = new EventEmitter<KpCatalogProduct>();

  /** Переход к редактированию записи в справочнике (только для `source === 'trade_good'`). */
  @Output() readonly editInDictionary = new EventEmitter<KpCatalogProduct>();

  readonly productCategoryOptions = computed<FilterOption[]>(() => {
    const categories = Array.from(new Set(this.productsInternal().map((p) => p.category))).sort((a, b) =>
      a.localeCompare(b),
    );
    return [{ value: 'all', label: 'Категория: все' }].concat(
      categories.map((c) => ({ value: c, label: `Категория: ${c}` })),
    );
  });

  /** Варианты подкатегории только при выбранной категории (не «все»). */
  readonly productSubcategoryOptions = computed<FilterOption[]>(() => {
    const cat = this.productCategory();
    if (cat === 'all') return [];
    const products = this.productsInternal().filter((p) => p.category === cat);
    const subs = new Set<string>();
    let hasEmpty = false;
    for (const p of products) {
      const s = kpCatalogSubcategoryText(p);
      if (s) subs.add(s);
      else hasEmpty = true;
    }
    const sorted = Array.from(subs).sort((a, b) => a.localeCompare(b, 'ru'));
    const opts: FilterOption[] = [{ value: 'all', label: 'Подкатегория: все' }];
    if (hasEmpty) opts.push({ value: KP_CATALOG_SUBCATEGORY_NONE_VALUE, label: 'Без подкатегории' });
    for (const s of sorted) opts.push({ value: s, label: `Подкатегория: ${s}` });
    return opts.length > 1 ? opts : [];
  });

  readonly productSortOptions: FilterOption[] = [
    { value: 'priceDesc', label: 'Сортировка: цена ↓' },
    { value: 'priceAsc', label: 'Сортировка: цена ↑' },
  ];

  readonly productKindOptions: FilterOption[] = [
    { value: 'all', label: 'Тип: все' },
    { value: 'ITEM', label: 'Тип: товар' },
    { value: 'COMPLEX', label: 'Тип: комплекс' },
  ];

  readonly filteredProducts = computed(() => {
    const kind = this.productKind();
    const productsByKind =
      kind === 'all' ? this.productsInternal() : this.productsInternal().filter((p) => p.kind === kind);
    return filterSortProductsForVitrine(
      productsByKind,
      this.productSearch(),
      this.productCategory(),
      this.productSubcategory(),
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
    this.productSubcategory.set('all');
    this.productPage.set(1);
  }

  onProductKindChange(value: string): void {
    if (value === 'ITEM' || value === 'COMPLEX') {
      this.productKind.set(value);
    } else {
      this.productKind.set('all');
    }
    this.productPage.set(1);
  }

  onProductSubcategory(value: string): void {
    this.productSubcategory.set(value || 'all');
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

  setCatalogViewMode(mode: 'cards' | 'table'): void {
    this.catalogViewMode.set(mode);
  }

  onAddToKp(p: KpCatalogProduct): void {
    this.addToKp.emit(p);
  }

  onEditInDictionary(p: KpCatalogProduct): void {
    if (p.source !== 'trade_good') return;
    this.editInDictionary.emit(p);
  }

  formatPrice(rub: number): string {
    return formatKpCatalogPriceRuble(rub);
  }

  cardMetaLine(p: KpCatalogProduct): string {
    return formatKpCatalogCardMetaLine(p);
  }

  /** Только реальный URL с API; без внешних placeholder-картинок. */
  imageUrl(p: KpCatalogProduct): string {
    return normalizeKpImageSrcForDisplay(String(p.imageUrl ?? '').trim());
  }
}
