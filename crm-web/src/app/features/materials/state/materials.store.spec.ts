import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GeometriesStore } from '../../geometries/state/geometries.store';
import { MaterialCharacteristicItem } from '../../material-characteristics/model/material-characteristic-item';
import { MaterialCharacteristicsStore } from '../../material-characteristics/state/material-characteristics.store';
import {
  MATERIALS_REPOSITORY,
  MaterialsRepository,
} from '../data/materials.repository';
import { MaterialItem } from '../model/material-item';
import { MaterialsStore } from './materials.store';

describe('MaterialsStore', () => {
  let store: InstanceType<typeof MaterialsStore>;

  const mockMc: MaterialCharacteristicItem[] = [
    {
      id: 'mc1',
      name: 'Profile',
      code: 'P1',
      densityKgM3: 1000,
      isActive: true,
    },
  ];

  const mockGeos = [
    {
      id: 'g1',
      name: 'Geo 1',
      shapeKey: 'rectangular',
      isActive: true,
    },
  ];

  const mockItems: MaterialItem[] = [
    {
      id: '2',
      name: 'Wood',
      unitId: 'u-1',
      unitName: 'кг (kg)',
      purchasePriceRub: 10,
      materialCharacteristicId: 'mc1',
      geometryId: 'g1',
      isActive: false,
    },
    {
      id: '1',
      name: 'Steel',
      unitId: 'u-1',
      unitName: 'кг (kg)',
      purchasePriceRub: 20,
      materialCharacteristicId: 'mc1',
      geometryId: 'g1',
      isActive: true,
    },
  ];

  const repo: jest.Mocked<MaterialsRepository> = {
    getItems: jest.fn(() => of(mockItems)),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.getItems.mockReturnValue(of(mockItems));

    TestBed.configureTestingModule({
      providers: [
        { provide: MATERIALS_REPOSITORY, useValue: repo },
        { provide: MaterialCharacteristicsStore, useValue: { items: signal(mockMc) } },
        { provide: GeometriesStore, useValue: { items: signal(mockGeos) } },
        MaterialsStore,
      ],
    });

    store = TestBed.inject(MaterialsStore);
  });

  it('loads items on loadItems()', () => {
    store.loadItems();

    expect(store.loading()).toBe(false);
    expect(store.items()).toEqual(mockItems);
    expect(repo.getItems).toHaveBeenCalledTimes(1);
  });

  it('handles repository error on loadItems()', () => {
    repo.getItems.mockReturnValue(throwError(() => new Error('Network error')));

    store.loadItems();

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Network error');
  });

  it('computes materialsData sorted by name', () => {
    store.loadItems();

    const names = store.materialsData().map((x) => x.name);
    expect(names).toEqual(['Steel', 'Wood']);
    expect(store.materialsData()[0].geometry).toBe('Geo 1');
  });

  it('startEdit and submit(valid) reset edit state', () => {
    store.startEdit('1');
    expect(store.editId()).toBe('1');

    store.submit({
      value: {
        name: 'Updated',
        unitId: 'u-1',
        unitName: 'кг (kg)',
        purchasePriceRub: 20,
        materialCharacteristicId: 'mc1',
        geometryId: 'g1',
        isActive: true,
      },
      isValid: true,
    });

    expect(repo.update).toHaveBeenCalledWith('1', {
      name: 'Updated',
      unitId: 'u-1',
      unitName: 'кг (kg)',
      purchasePriceRub: 20,
      materialCharacteristicId: 'mc1',
      geometryId: 'g1',
      isActive: true,
    });
    expect(store.editId()).toBeNull();
    expect(store.formSubmitAttempted()).toBe(false);
  });

  it('submit(invalid) marks submit attempted', () => {
    store.submit({
      value: {
        name: '',
        materialCharacteristicId: '',
        geometryId: '',
        isActive: true,
      },
      isValid: false,
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(store.formSubmitAttempted()).toBe(true);
  });
});
