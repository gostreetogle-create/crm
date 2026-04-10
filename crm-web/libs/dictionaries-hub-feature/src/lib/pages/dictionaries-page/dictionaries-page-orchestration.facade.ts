import { afterNextRender, Injectable, inject } from '@angular/core';
import {
  ClientsStore,
  CoatingsStore,
  ColorsStore,
  CommercialOffersStore,
  GeometriesStore,
  KpPhotosStore,
  MaterialCharacteristicsStore,
  MaterialsStore,
  OrdersStore,
  OrganizationsStore,
  ProductionDetailsStore,
  ProductionWorkTypesStore,
  ProductsStore,
  SurfaceFinishesStore,
  TradeGoodCategoriesStore,
  TradeGoodSubcategoriesStore,
  TradeGoodsStore,
  UnitsStore,
} from '@srm/dictionaries-state';
import { WorkersStore } from './workers.store';

/** На маршруте `/справочники`: инжектит route-scoped store'ы (`MaterialsStore`, …). */
@Injectable()
export class DictionariesPageOrchestrationFacade {
  private readonly materialsStore = inject(MaterialsStore);
  private readonly materialCharacteristicsStore = inject(MaterialCharacteristicsStore);
  private readonly geometriesStore = inject(GeometriesStore);
  private readonly unitsStore = inject(UnitsStore);
  private readonly commercialOffersStore = inject(CommercialOffersStore);
  private readonly ordersStore = inject(OrdersStore);
  private readonly kpPhotosStore = inject(KpPhotosStore);
  private readonly colorsStore = inject(ColorsStore);
  private readonly coatingsStore = inject(CoatingsStore);
  private readonly surfaceFinishesStore = inject(SurfaceFinishesStore);
  private readonly productionWorkTypesStore = inject(ProductionWorkTypesStore);
  private readonly productionDetailsStore = inject(ProductionDetailsStore);
  private readonly productsStore = inject(ProductsStore);
  private readonly tradeGoodsStore = inject(TradeGoodsStore);
  private readonly tradeGoodCategoriesStore = inject(TradeGoodCategoriesStore);
  private readonly tradeGoodSubcategoriesStore = inject(TradeGoodSubcategoriesStore);
  private readonly clientsStore = inject(ClientsStore);
  private readonly organizationsStore = inject(OrganizationsStore);
  private readonly workersStore = inject(WorkersStore);
  private initialized = false;
  private deferredWaveScheduled = false;

  private loadByKey(key: string): void {
    switch (key) {
      case 'materials':
        this.materialsStore.loadItems();
        break;
      case 'materialCharacteristics':
        this.materialCharacteristicsStore.loadItems();
        break;
      case 'geometries':
        this.geometriesStore.loadItems();
        break;
      case 'units':
        this.unitsStore.loadItems();
        break;
      case 'commercialOffers':
        this.commercialOffersStore.loadItems();
        break;
      case 'orders':
        this.ordersStore.loadItems();
        break;
      case 'kpPhotos':
        this.kpPhotosStore.loadItems();
        break;
      case 'colors':
        this.colorsStore.loadItems();
        break;
      case 'coatings':
        this.coatingsStore.loadItems();
        break;
      case 'surfaceFinishes':
        this.surfaceFinishesStore.loadItems();
        break;
      case 'productionWorkTypes':
        this.productionWorkTypesStore.loadItems();
        break;
      case 'productionDetails':
        this.productionDetailsStore.loadItems();
        break;
      case 'products':
        this.productsStore.loadItems();
        break;
      case 'tradeGoods':
        this.tradeGoodsStore.loadItems();
        break;
      case 'tradeGoodCategories':
        this.tradeGoodCategoriesStore.loadItems();
        break;
      case 'tradeGoodSubcategories':
        this.tradeGoodSubcategoriesStore.loadItems();
        break;
      case 'clients':
        this.clientsStore.loadItems();
        break;
      case 'organizations':
        this.organizationsStore.loadItems();
        break;
      case 'workers':
        this.workersStore.loadWorkers();
        break;
      default:
        break;
    }
  }

  private criticalKeys(activeKey: string | null | undefined): string[] {
    switch (activeKey) {
      case 'tradeGoods':
        return ['tradeGoods', 'tradeGoodCategories', 'tradeGoodSubcategories', 'units'];
      case 'materials':
        return ['materials', 'materialCharacteristics', 'colors', 'coatings', 'surfaceFinishes', 'units'];
      case 'commercialOffers':
        return ['commercialOffers', 'orders', 'clients', 'organizations', 'tradeGoods'];
      case 'orders':
        return ['orders', 'commercialOffers', 'clients', 'organizations'];
      default:
        return ['tradeGoods', 'tradeGoodCategories', 'tradeGoodSubcategories'];
    }
  }

  loadInitial(activeKey?: string | null): void {
    if (this.initialized) return;
    this.initialized = true;
    const allKeys = [
      'materials',
      'materialCharacteristics',
      'geometries',
      'units',
      'commercialOffers',
      'orders',
      'kpPhotos',
      'colors',
      'coatings',
      'surfaceFinishes',
      'productionWorkTypes',
      'productionDetails',
      'products',
      'tradeGoods',
      'tradeGoodCategories',
      'tradeGoodSubcategories',
      'clients',
      'organizations',
      'workers',
    ];
    const critical = this.criticalKeys(activeKey);
    for (const key of critical) this.loadByKey(key);
    if (this.deferredWaveScheduled) return;
    this.deferredWaveScheduled = true;
    afterNextRender(() => {
      for (const key of allKeys) {
        if (critical.includes(key)) continue;
        this.loadByKey(key);
      }
    });
  }

  refreshTradeGoodsCascade(): void {
    this.tradeGoodsStore.loadItems();
    this.tradeGoodSubcategoriesStore.loadItems();
  }

  refreshColorCharacteristicsCascade(): void {
    this.colorsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
  }

  refreshSurfaceFinishCharacteristicsCascade(): void {
    this.surfaceFinishesStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
  }

  refreshCoatingCharacteristicsCascade(): void {
    this.coatingsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
  }

  /** Только список покрытий (после локального propagation без тиража на характеристики). */
  refreshCoatingsOnly(): void {
    this.coatingsStore.loadItems();
  }

  /** Только список цветов (локальный propagation). */
  refreshColorsOnly(): void {
    this.colorsStore.loadItems();
  }

  /** Только список отделок поверхности (локальный propagation). */
  refreshSurfaceFinishesOnly(): void {
    this.surfaceFinishesStore.loadItems();
  }
}
