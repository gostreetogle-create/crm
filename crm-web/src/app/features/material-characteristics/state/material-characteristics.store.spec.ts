import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  MATERIAL_CHARACTERISTICS_REPOSITORY,
  MaterialCharacteristicsRepository,
} from '../data/material-characteristics.repository';
import {
  MaterialCharacteristicItem,
  MaterialCharacteristicItemInput,
} from '../model/material-characteristic-item';
import { MaterialCharacteristicsStore } from './material-characteristics.store';

describe('MaterialCharacteristicsStore', () => {
  let store: InstanceType<typeof MaterialCharacteristicsStore>;

  const mockItems: MaterialCharacteristicItem[] = [
    {
      id: 'mc-a',
      name: 'Сталь профиль',
      code: 'ST-P1',
      densityKgM3: 7850,
      colorId: 'c1',
      colorName: 'Серый',
      colorHex: '#6B7280',
      surfaceFinishId: 'sf1',
      finishType: 'Matte',
      roughnessClass: 'Ra 3.2',
      raMicron: 3.2,
      coatingId: 'coat1',
      coatingType: 'Powder coating',
      coatingSpec: 'RAL polyester',
      coatingThicknessMicron: 80,
      notes: 'Тест',
      isActive: true,
    },
    {
      id: 'mc-b',
      name: 'Алюминий',
      code: 'AL-1',
      densityKgM3: 2700,
      isActive: false,
    },
  ];

  const repo: jest.Mocked<MaterialCharacteristicsRepository> = {
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
      providers: [
        { provide: MATERIAL_CHARACTERISTICS_REPOSITORY, useValue: repo },
        MaterialCharacteristicsStore,
      ],
    });

    store = TestBed.inject(MaterialCharacteristicsStore);
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

  it('materialCharacteristicsData is sorted by name and exposes color/finish/coating', () => {
    store.loadItems();

    const data = store.materialCharacteristicsData();
    expect(data.map((x) => x.name)).toEqual(['Алюминий', 'Сталь профиль']);
    const steel = data.find((x) => x.id === 'mc-a')!;
    expect(steel.color).toContain('Серый');
    expect(steel.colorHex).toBe('#6B7280');
    expect(steel.finish).toContain('Matte');
    expect(steel.coating).toContain('Powder');
  });

  it('startEdit and submit(valid) calls update and clears editId', () => {
    store.loadItems();
    store.startEdit('mc-a');

    const value: MaterialCharacteristicItemInput = {
      name: 'Сталь обновл.',
      code: 'ST-P1',
      densityKgM3: 7850,
      colorId: 'c1',
      colorName: 'Серый',
      colorHex: '#6B7280',
      surfaceFinishId: 'sf1',
      finishType: 'Matte',
      roughnessClass: 'Ra 3.2',
      raMicron: 3.2,
      coatingId: 'coat1',
      coatingType: 'Powder coating',
      coatingSpec: 'RAL polyester',
      coatingThicknessMicron: 80,
      notes: 'Тест',
      isActive: true,
    };
    store.submit({ value, isValid: true });

    expect(repo.update).toHaveBeenCalledWith('mc-a', expect.objectContaining({ name: 'Сталь обновл.' }));
    expect(store.editId()).toBeNull();
  });

  it('submit(invalid) marks formSubmitAttempted', () => {
    store.submit({
      value: { name: '', isActive: true } as MaterialCharacteristicItemInput,
      isValid: false,
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(store.formSubmitAttempted()).toBe(true);
  });

  it('createMany calls create for each row', () => {
    store.loadItems();
    store.createMany([
      {
        name: 'Новая',
        code: 'N1',
        isActive: true,
      },
    ]);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Новая', code: 'N1', isActive: true })
    );
  });

  it('delete removes and refreshes', () => {
    store.loadItems();
    store.delete('mc-b');

    expect(repo.remove).toHaveBeenCalledWith('mc-b');
  });
});
