import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  MATERIALS_REPOSITORY,
  MaterialsRepository,
} from '../data/materials.repository';
import { MaterialItem } from '../model/material-item';
import { MaterialsStore } from './materials.store';

describe('MaterialsStore', () => {
  let store: InstanceType<typeof MaterialsStore>;

  const mockItems: MaterialItem[] = [
    { id: '2', name: 'Wood', isActive: false },
    { id: '1', name: 'Steel', isActive: true },
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
      providers: [{ provide: MATERIALS_REPOSITORY, useValue: repo }, MaterialsStore],
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
  });

  it('startEdit and submit(valid) reset edit state', () => {
    store.startEdit('1');
    expect(store.editId()).toBe('1');

    store.submit({
      value: { name: 'Updated', isActive: true },
      isValid: true,
    });

    expect(repo.update).toHaveBeenCalledWith('1', { name: 'Updated', isActive: true });
    expect(store.editId()).toBeNull();
    expect(store.formSubmitAttempted()).toBe(false);
  });

  it('submit(invalid) marks submit attempted', () => {
    store.submit({
      value: { name: '', isActive: true },
      isValid: false,
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(store.formSubmitAttempted()).toBe(true);
  });
});
