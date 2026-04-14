import { Route } from '@angular/router';
import { OrderDetailsPage } from './pages/order-details-page/order-details-page';
import { OrdersListPage } from './pages/orders-list-page/orders-list-page';

export const ORDERS_FEATURE_ROUTES: Route[] = [
  { path: '', component: OrdersListPage },
  { path: ':id', component: OrderDetailsPage },
];
