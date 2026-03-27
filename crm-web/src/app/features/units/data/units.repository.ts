import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { UnitItem, UnitItemInput } from '../model/unit-item';

export interface UnitsRepository {
  getItems(): Observable<UnitItem[]>;
  create(input: UnitItemInput): void;
  update(id: string, input: UnitItemInput): void;
  remove(id: string): void;
}

export const UNITS_REPOSITORY = new InjectionToken<UnitsRepository>('UNITS_REPOSITORY');

