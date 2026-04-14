import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import {
  WarehouseMovement,
  WarehouseMovementInput,
  WarehouseProduct,
  WarehouseProductInput,
  WarehouseSummary,
} from './warehouse.models';
import { WarehouseRepository } from './warehouse.repository';

@Injectable()
export class WarehouseHttpRepository implements WarehouseRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private endpoint(path = ''): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}/api/warehouse${path}`;
  }

  getProducts(query?: {
    search?: string;
    category?: string;
    sortBy?: 'name' | 'category' | 'quantity' | 'price' | 'createdAt' | 'updatedAt';
    sortDir?: 'asc' | 'desc';
  }): Observable<WarehouseProduct[]> {
    let params = new HttpParams();
    if (query?.search) params = params.set('search', query.search);
    if (query?.category) params = params.set('category', query.category);
    if (query?.sortBy) params = params.set('sortBy', query.sortBy);
    if (query?.sortDir) params = params.set('sortDir', query.sortDir);
    return this.http.get<WarehouseProduct[]>(this.endpoint('/products'), { params });
  }

  getProductById(id: string): Observable<WarehouseProduct> {
    return this.http.get<WarehouseProduct>(this.endpoint(`/products/${id}`));
  }

  createProduct(input: WarehouseProductInput): Observable<WarehouseProduct> {
    return this.http.post<WarehouseProduct>(this.endpoint('/products'), input);
  }

  updateProduct(id: string, input: WarehouseProductInput): Observable<WarehouseProduct> {
    return this.http.put<WarehouseProduct>(this.endpoint(`/products/${id}`), input);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/products/${id}`));
  }

  getMovements(): Observable<WarehouseMovement[]> {
    return this.http.get<WarehouseMovement[]>(this.endpoint('/movements'));
  }

  createMovement(input: WarehouseMovementInput): Observable<WarehouseMovement> {
    return this.http.post<WarehouseMovement>(this.endpoint('/movements'), input);
  }

  getSummary(): Observable<WarehouseSummary> {
    return this.http.get<WarehouseSummary>(this.endpoint('/summary'));
  }
}
