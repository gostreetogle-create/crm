import { Route } from '@angular/router';
import { WarehouseDashboardPage } from './pages/warehouse-dashboard-page';
import { WarehouseMovementsPage } from './pages/warehouse-movements-page';
import { WarehouseProductDetailsPage } from './pages/warehouse-product-details-page';
import { WarehouseProductFormPage } from './pages/warehouse-product-form-page';
import { WarehouseProductsPage } from './pages/warehouse-products-page';

export const WAREHOUSE_ROUTES: Route[] = [
  { path: '', component: WarehouseDashboardPage },
  { path: 'products', component: WarehouseProductsPage },
  { path: 'products/new', component: WarehouseProductFormPage },
  { path: 'products/:id/edit', component: WarehouseProductFormPage },
  { path: 'products/:id', component: WarehouseProductDetailsPage },
  { path: 'movements', component: WarehouseMovementsPage },
];
