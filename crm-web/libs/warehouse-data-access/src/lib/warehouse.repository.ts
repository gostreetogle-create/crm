import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  WarehouseMovement,
  WarehouseMovementInput,
  WarehouseProduct,
  WarehouseProductInput,
  WarehouseSummary,
} from './warehouse.models';

export const WAREHOUSE_REPOSITORY = new InjectionToken<WarehouseRepository>('WAREHOUSE_REPOSITORY');

export interface WarehouseRepository {
  getProducts(query?: {
    search?: string;
    category?: string;
    sortBy?: 'name' | 'category' | 'quantity' | 'price' | 'createdAt' | 'updatedAt';
    sortDir?: 'asc' | 'desc';
  }): Observable<WarehouseProduct[]>;
  getProductById(id: string): Observable<WarehouseProduct>;
  createProduct(input: WarehouseProductInput): Observable<WarehouseProduct>;
  updateProduct(id: string, input: WarehouseProductInput): Observable<WarehouseProduct>;
  deleteProduct(id: string): Observable<void>;
  getMovements(): Observable<WarehouseMovement[]>;
  createMovement(input: WarehouseMovementInput): Observable<WarehouseMovement>;
  getSummary(): Observable<WarehouseSummary>;
}
