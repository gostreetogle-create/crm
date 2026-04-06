import type { Provider } from '@angular/core';
import { DictionariesMaterialStandaloneFlowService } from './dictionaries-material-standalone-flow.service';
import { COLORS_REPOSITORY, ColorsHttpRepository } from '@srm/colors-data-access';
import { CLIENTS_REPOSITORY, ClientsHttpRepository } from '@srm/clients-data-access';
import {
  ClientsStore,
  CoatingsStore,
  ColorsStore,
  GeometriesStore,
  KpPhotosStore,
  MaterialCharacteristicsStore,
  MaterialsStore,
  OrganizationsStore,
  ProductionDetailsStore,
  ProductsStore,
  ProductionWorkTypesStore,
  SurfaceFinishesStore,
  TradeGoodsStore,
  TradeGoodCategoriesStore,
  TradeGoodSubcategoriesStore,
  UnitsStore,
  ComplexesStore,
} from '@srm/dictionaries-state';
import { COATINGS_REPOSITORY, CoatingsHttpRepository } from '@srm/coatings-data-access';
import { GEOMETRIES_REPOSITORY, GeometriesHttpRepository } from '@srm/geometries-data-access';
import {
  MATERIAL_CHARACTERISTICS_REPOSITORY,
  MaterialCharacteristicsHttpRepository,
} from '@srm/material-characteristics-data-access';
import { MATERIALS_REPOSITORY, MaterialsHttpRepository } from '@srm/materials-data-access';
import { ORGANIZATIONS_REPOSITORY, OrganizationsHttpRepository } from '@srm/organizations-data-access';
import {
  PRODUCTION_DETAILS_REPOSITORY,
  ProductionDetailsHttpRepository,
} from '@srm/production-details-data-access';
import { PRODUCTS_REPOSITORY, ProductsHttpRepository } from '@srm/products-data-access';
import {
  TRADE_GOODS_REPOSITORY,
  TradeGoodsHttpRepository,
  TRADE_GOOD_CATEGORIES_REPOSITORY,
  TradeGoodCategoriesHttpRepository,
  TRADE_GOOD_SUBCATEGORIES_REPOSITORY,
  TradeGoodSubcategoriesHttpRepository,
} from '@srm/trade-goods-data-access';
import {
  PRODUCTION_WORK_TYPES_REPOSITORY,
  ProductionWorkTypesHttpRepository,
} from '@srm/production-work-types-data-access';
import {
  SURFACE_FINISHES_REPOSITORY,
  SurfaceFinishesHttpRepository,
} from '@srm/surface-finishes-data-access';
import { KP_PHOTOS_REPOSITORY, KpPhotosHttpRepository } from '@srm/kp-photos-data-access';
import { UNITS_REPOSITORY, UnitsHttpRepository } from '@srm/units-data-access';
import { COMPLEXES_REPOSITORY, ComplexesHttpRepository } from '@srm/catalog-suite-data-access';

/**
 * Route-level providers for the unified dictionaries hub (`/справочники`).
 * Keeps `app.routes.ts` readable; add new dictionary DI here.
 */
export const DICTIONARIES_ROUTE_PROVIDERS: Provider[] = [
  DictionariesMaterialStandaloneFlowService,
  MaterialsHttpRepository,
  MaterialsStore,
  { provide: MATERIALS_REPOSITORY, useExisting: MaterialsHttpRepository },
  MaterialCharacteristicsHttpRepository,
  MaterialCharacteristicsStore,
  {
    provide: MATERIAL_CHARACTERISTICS_REPOSITORY,
    useExisting: MaterialCharacteristicsHttpRepository,
  },
  GeometriesHttpRepository,
  GeometriesStore,
  { provide: GEOMETRIES_REPOSITORY, useExisting: GeometriesHttpRepository },
  UnitsHttpRepository,
  UnitsStore,
  { provide: UNITS_REPOSITORY, useExisting: UnitsHttpRepository },
  ColorsHttpRepository,
  ColorsStore,
  { provide: COLORS_REPOSITORY, useExisting: ColorsHttpRepository },
  CoatingsHttpRepository,
  CoatingsStore,
  { provide: COATINGS_REPOSITORY, useExisting: CoatingsHttpRepository },
  SurfaceFinishesHttpRepository,
  SurfaceFinishesStore,
  { provide: SURFACE_FINISHES_REPOSITORY, useExisting: SurfaceFinishesHttpRepository },
  ProductionWorkTypesHttpRepository,
  ProductionWorkTypesStore,
  {
    provide: PRODUCTION_WORK_TYPES_REPOSITORY,
    useExisting: ProductionWorkTypesHttpRepository,
  },
  ProductionDetailsHttpRepository,
  ProductionDetailsStore,
  {
    provide: PRODUCTION_DETAILS_REPOSITORY,
    useExisting: ProductionDetailsHttpRepository,
  },
  ProductsHttpRepository,
  ProductsStore,
  { provide: PRODUCTS_REPOSITORY, useExisting: ProductsHttpRepository },
  TradeGoodsHttpRepository,
  TradeGoodsStore,
  { provide: TRADE_GOODS_REPOSITORY, useExisting: TradeGoodsHttpRepository },
  TradeGoodCategoriesHttpRepository,
  TradeGoodCategoriesStore,
  { provide: TRADE_GOOD_CATEGORIES_REPOSITORY, useExisting: TradeGoodCategoriesHttpRepository },
  TradeGoodSubcategoriesHttpRepository,
  TradeGoodSubcategoriesStore,
  { provide: TRADE_GOOD_SUBCATEGORIES_REPOSITORY, useExisting: TradeGoodSubcategoriesHttpRepository },
  ClientsHttpRepository,
  ClientsStore,
  { provide: CLIENTS_REPOSITORY, useExisting: ClientsHttpRepository },
  OrganizationsHttpRepository,
  OrganizationsStore,
  { provide: ORGANIZATIONS_REPOSITORY, useExisting: OrganizationsHttpRepository },
  KpPhotosHttpRepository,
  KpPhotosStore,
  { provide: KP_PHOTOS_REPOSITORY, useExisting: KpPhotosHttpRepository },
  ComplexesHttpRepository,
  ComplexesStore,
  { provide: COMPLEXES_REPOSITORY, useExisting: ComplexesHttpRepository },
];
