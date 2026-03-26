import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MaterialGeometryRepository } from './material-geometry.repository';
import { MaterialGeometryModel } from '../model/material-geometry-model';
import { API_CONFIG } from '../../../core/api/api-config';

@Injectable()
export class MaterialGeometryHttpRepository implements MaterialGeometryRepository {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  getModel(): Observable<MaterialGeometryModel> {
    const path = '/material-geometry/model';
    const base = this.apiConfig.baseUrl?.replace(/\/+$/, '') ?? '';
    const url = `${base}${path}`;
    return this.http.get<MaterialGeometryModel>(url);
  }
}

