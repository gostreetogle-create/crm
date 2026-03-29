import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  GEOMETRIES_REPOSITORY,
  GeometriesRepository,
} from '../data/geometries.repository';
import { GeometryItem } from '../model/geometry-item';
import { GeometriesStore } from './geometries.store';

describe('GeometriesStore', () => {
  let store: InstanceType<typeof GeometriesStore>;

  const mockItems: GeometryItem[] = [
    { id: '1', name: 'Polygon A', shapeKey: 'polygon', isActive: true },
    { id: '2', name: 'Circle B', shapeKey: 'circle', isActive: false },
  ];

  const repo: jest.Mocked<GeometriesRepository> = {
    getItems: jest.fn(() => of(mockItems)),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.getItems.mockReturnValue(of(mockItems));
    repo.create.mockReturnValue(of(mockItems[0]));
    repo.update.mockReturnValue(of(mockItems[0]));
    repo.remove.mockReturnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [{ provide: GEOMETRIES_REPOSITORY, useValue: repo }],
    });

    store = TestBed.inject(GeometriesStore);
  });

  it('loads geometries on loadItems()', () => {
    store.loadItems();

    expect(store.items()).toEqual(mockItems);
    expect(store.loading()).toBe(false);
    expect(repo.getItems).toHaveBeenCalledTimes(1);
  });

  it('computed facts counts polygons', () => {
    store.loadItems();

    expect(store.facts().total).toBe(2);
    expect(store.facts().polygons).toBe(1);
  });

  it('openEdit and submit(valid) close dialog', () => {
    store.openEdit('1');
    expect(store.editId()).toBe('1');
    expect(store.isEditDialogOpen()).toBe(true);

    store.submit({
      value: { name: 'Updated', shapeKey: 'polygon', isActive: true },
      isValid: true,
    });

    expect(repo.update).toHaveBeenCalledWith('1', {
      name: 'Updated',
      shapeKey: 'polygon',
      isActive: true,
    });
    expect(store.editId()).toBeNull();
    expect(store.isEditDialogOpen()).toBe(false);
  });

  it('delete clears edit state when deleting edited row', () => {
    store.openEdit('2');
    store.delete('2');

    expect(repo.remove).toHaveBeenCalledWith('2');
    expect(store.editId()).toBeNull();
    expect(store.isEditDialogOpen()).toBe(false);
  });
});
