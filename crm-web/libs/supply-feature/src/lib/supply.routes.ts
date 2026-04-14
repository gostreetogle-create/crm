import { Route } from '@angular/router';
import { SupplyDetailsPage } from './pages/supply-details-page';
import { SupplyListPage } from './pages/supply-list-page';

export const SUPPLY_ROUTES: Route[] = [
  { path: '', component: SupplyListPage },
  { path: ':id', component: SupplyDetailsPage },
];
