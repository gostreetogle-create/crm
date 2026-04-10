import { Route } from '@angular/router';
import { ProductionBoardPage } from './pages/production-board-page/production-board-page';
import { ProductionOrderPage } from './pages/production-order-page/production-order-page';

export const PRODUCTION_ROUTES: Route[] = [
  { path: '', component: ProductionBoardPage },
  { path: ':id', component: ProductionOrderPage },
];
