import { of } from 'rxjs';
import type { CoatingsRepository } from '@srm/coatings-data-access';
import type { ColorsRepository } from '@srm/colors-data-access';
import type { SurfaceFinishesRepository } from '@srm/surface-finishes-data-access';
import {
  linkedUpdateColorGlobal,
  linkedDeleteColorLocal,
  linkedUpdateCoatingLocal,
  linkedUpdateSurfaceFinishGlobal,
} from './dictionaries-linked-propagation.operations';

describe('dictionaries-linked-propagation.operations', () => {
  const colorsRepo = {
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as ColorsRepository;

  const coatingsRepo = {
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as CoatingsRepository;

  const surfaceFinishesRepo = {
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as SurfaceFinishesRepository;

  beforeEach(() => jest.clearAllMocks());

  it('linkedUpdateColorGlobal passes propagation global', async () => {
    const payload = {} as never;
    (colorsRepo.update as jest.Mock).mockReturnValue(of({ ok: true }));
    await linkedUpdateColorGlobal(colorsRepo, 'c1', payload);
    expect(colorsRepo.update).toHaveBeenCalledWith('c1', payload, { propagation: 'global' });
  });

  it('linkedDeleteColorLocal passes propagation local', async () => {
    (colorsRepo.remove as jest.Mock).mockReturnValue(of(void 0));
    await linkedDeleteColorLocal(colorsRepo, 'c1');
    expect(colorsRepo.remove).toHaveBeenCalledWith('c1', { propagation: 'local' });
  });

  it('linkedUpdateCoatingLocal calls update without propagation option', async () => {
    const payload = {} as never;
    (coatingsRepo.update as jest.Mock).mockReturnValue(of({}));
    await linkedUpdateCoatingLocal(coatingsRepo, 'k1', payload);
    expect(coatingsRepo.update).toHaveBeenCalledWith('k1', payload);
  });

  it('linkedUpdateSurfaceFinishGlobal passes propagation global', async () => {
    const payload = {} as never;
    (surfaceFinishesRepo.update as jest.Mock).mockReturnValue(of({}));
    await linkedUpdateSurfaceFinishGlobal(surfaceFinishesRepo, 's1', payload);
    expect(surfaceFinishesRepo.update).toHaveBeenCalledWith('s1', payload, { propagation: 'global' });
  });
});
