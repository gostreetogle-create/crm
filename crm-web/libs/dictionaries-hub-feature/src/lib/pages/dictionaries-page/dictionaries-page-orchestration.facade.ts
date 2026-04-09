import { Injectable, inject } from '@angular/core';
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

  loadInitial(): void {
    this.materialsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.geometriesStore.loadItems();
    this.unitsStore.loadItems();
    this.commercialOffersStore.loadItems();
    this.ordersStore.loadItems();
    this.kpPhotosStore.loadItems();
    this.colorsStore.loadItems();
    this.coatingsStore.loadItems();
    this.surfaceFinishesStore.loadItems();
    this.productionWorkTypesStore.loadItems();
    this.productionDetailsStore.loadItems();
    this.productsStore.loadItems();
    this.tradeGoodsStore.loadItems();
    this.tradeGoodCategoriesStore.loadItems();
    this.tradeGoodSubcategoriesStore.loadItems();
    this.clientsStore.loadItems();
    this.organizationsStore.loadItems();
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
