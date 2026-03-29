import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ColorItem, ColorItemInput } from '../model/color-item';
import { ColorsRepository } from './colors.repository';

function newId(): string {
  return `c-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function rgbFromHex(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '').trim().replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(clean)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function normalizeHex(hex: string): string {
  const clean = (hex || '').trim().replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(clean)) {
    return '#000000';
  }
  return `#${clean}`;
}

/** Стабильные id для FK из других справочников (импорт, сиды). */
const SEED: ColorItem[] = [
  {
    id: 'c-seed-ral-1000',
    ralCode: 'RAL 1000',
    name: 'Green beige',
    hex: '#CDBA88',
    rgb: rgbFromHex('#CDBA88'),
  },
  {
    id: 'c-seed-ral-7035',
    ralCode: 'RAL 7035',
    name: 'Light grey',
    hex: '#CBD0CC',
    rgb: rgbFromHex('#CBD0CC'),
  },
  {
    id: 'c-seed-ral-9005',
    ralCode: 'RAL 9005',
    name: 'Jet black',
    hex: '#0A0A0D',
    rgb: rgbFromHex('#0A0A0D'),
  },
  {
    id: 'c-seed-gray-custom',
    name: 'Серый',
    hex: '#6B7280',
    rgb: rgbFromHex('#6B7280'),
  },
  {
    id: 'c-seed-silver-custom',
    name: 'Серебристый',
    hex: '#C0C0C0',
    rgb: rgbFromHex('#C0C0C0'),
  },
];

@Injectable()
export class ColorsMockRepository implements ColorsRepository {
  private readonly itemsSubject = new BehaviorSubject<ColorItem[]>(SEED);

  getItems(): Observable<ColorItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: ColorItemInput): void {
    const hex = normalizeHex(input.hex);
    const next: ColorItem = {
      id: newId(),
      ...input,
      hex,
      rgb: rgbFromHex(hex),
    };
    this.itemsSubject.next([next, ...this.itemsSubject.value]);
  }

  update(id: string, input: ColorItemInput): void {
    const hex = normalizeHex(input.hex);
    const updated = this.itemsSubject.value.map((x) =>
      x.id === id
        ? {
            id,
            ...input,
            hex,
            rgb: rgbFromHex(hex),
          }
        : x
    );
    this.itemsSubject.next(updated);
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
