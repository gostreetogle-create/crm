import { firstValueFrom } from 'rxjs';
import type { CoatingItemInput, CoatingsRepository } from '@srm/coatings-data-access';
import type { ColorItemInput, ColorsRepository } from '@srm/colors-data-access';
import type { SurfaceFinishItemInput, SurfaceFinishesRepository } from '@srm/surface-finishes-data-access';

export async function linkedUpdateColorLocal(
  repo: ColorsRepository,
  colorId: string,
  payload: ColorItemInput,
): Promise<unknown> {
  return firstValueFrom(repo.update(colorId, payload));
}

export async function linkedUpdateColorGlobal(
  repo: ColorsRepository,
  colorId: string,
  payload: ColorItemInput,
): Promise<unknown> {
  return firstValueFrom(repo.update(colorId, payload, { propagation: 'global' }));
}

export async function linkedDeleteColorLocal(repo: ColorsRepository, colorId: string): Promise<unknown> {
  return firstValueFrom(repo.remove(colorId, { propagation: 'local' }));
}

export async function linkedDeleteColorGlobal(repo: ColorsRepository, colorId: string): Promise<unknown> {
  return firstValueFrom(repo.remove(colorId, { propagation: 'global' }));
}

export async function linkedUpdateCoatingLocal(
  repo: CoatingsRepository,
  coatingId: string,
  payload: CoatingItemInput,
): Promise<unknown> {
  return firstValueFrom(repo.update(coatingId, payload));
}

export async function linkedUpdateCoatingGlobal(
  repo: CoatingsRepository,
  coatingId: string,
  payload: CoatingItemInput,
): Promise<unknown> {
  return firstValueFrom(repo.update(coatingId, payload, { propagation: 'global' }));
}

export async function linkedDeleteCoatingLocal(repo: CoatingsRepository, coatingId: string): Promise<unknown> {
  return firstValueFrom(repo.remove(coatingId, { propagation: 'local' }));
}

export async function linkedDeleteCoatingGlobal(repo: CoatingsRepository, coatingId: string): Promise<unknown> {
  return firstValueFrom(repo.remove(coatingId, { propagation: 'global' }));
}

export async function linkedUpdateSurfaceFinishLocal(
  repo: SurfaceFinishesRepository,
  surfaceFinishId: string,
  payload: SurfaceFinishItemInput,
): Promise<unknown> {
  return firstValueFrom(repo.update(surfaceFinishId, payload));
}

export async function linkedUpdateSurfaceFinishGlobal(
  repo: SurfaceFinishesRepository,
  surfaceFinishId: string,
  payload: SurfaceFinishItemInput,
): Promise<unknown> {
  return firstValueFrom(repo.update(surfaceFinishId, payload, { propagation: 'global' }));
}

export async function linkedDeleteSurfaceFinishLocal(
  repo: SurfaceFinishesRepository,
  surfaceFinishId: string,
): Promise<unknown> {
  return firstValueFrom(repo.remove(surfaceFinishId, { propagation: 'local' }));
}

export async function linkedDeleteSurfaceFinishGlobal(
  repo: SurfaceFinishesRepository,
  surfaceFinishId: string,
): Promise<unknown> {
  return firstValueFrom(repo.remove(surfaceFinishId, { propagation: 'global' }));
}
