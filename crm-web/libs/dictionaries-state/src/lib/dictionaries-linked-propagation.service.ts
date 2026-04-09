import { inject, Injectable } from '@angular/core';
import { COATINGS_REPOSITORY, type CoatingItemInput, type CoatingsRepository } from '@srm/coatings-data-access';
import { COLORS_REPOSITORY, type ColorItemInput, type ColorsRepository } from '@srm/colors-data-access';
import {
  SURFACE_FINISHES_REPOSITORY,
  type SurfaceFinishItemInput,
  type SurfaceFinishesRepository,
} from '@srm/surface-finishes-data-access';
import {
  linkedDeleteCoatingGlobal,
  linkedDeleteCoatingLocal,
  linkedDeleteColorGlobal,
  linkedDeleteColorLocal,
  linkedDeleteSurfaceFinishGlobal,
  linkedDeleteSurfaceFinishLocal,
  linkedUpdateCoatingGlobal,
  linkedUpdateCoatingLocal,
  linkedUpdateColorGlobal,
  linkedUpdateColorLocal,
  linkedUpdateSurfaceFinishGlobal,
  linkedUpdateSurfaceFinishLocal,
} from './dictionaries-linked-propagation.operations';

/** Регистрируется в `DICTIONARIES_ROUTE_PROVIDERS` — нужны репозитории цветов/покрытий/отделок с маршрута. */
@Injectable()
export class DictionariesLinkedPropagationService {
  private readonly colorsRepo = inject<ColorsRepository>(COLORS_REPOSITORY);
  private readonly coatingsRepo = inject<CoatingsRepository>(COATINGS_REPOSITORY);
  private readonly surfaceFinishesRepo = inject<SurfaceFinishesRepository>(SURFACE_FINISHES_REPOSITORY);

  updateColorLocal(colorId: string, payload: ColorItemInput): Promise<unknown> {
    return linkedUpdateColorLocal(this.colorsRepo, colorId, payload);
  }

  updateColorGlobal(colorId: string, payload: ColorItemInput): Promise<unknown> {
    return linkedUpdateColorGlobal(this.colorsRepo, colorId, payload);
  }

  deleteColorLocal(colorId: string): Promise<unknown> {
    return linkedDeleteColorLocal(this.colorsRepo, colorId);
  }

  deleteColorGlobal(colorId: string): Promise<unknown> {
    return linkedDeleteColorGlobal(this.colorsRepo, colorId);
  }

  updateCoatingLocal(coatingId: string, payload: CoatingItemInput): Promise<unknown> {
    return linkedUpdateCoatingLocal(this.coatingsRepo, coatingId, payload);
  }

  updateCoatingGlobal(coatingId: string, payload: CoatingItemInput): Promise<unknown> {
    return linkedUpdateCoatingGlobal(this.coatingsRepo, coatingId, payload);
  }

  deleteCoatingLocal(coatingId: string): Promise<unknown> {
    return linkedDeleteCoatingLocal(this.coatingsRepo, coatingId);
  }

  deleteCoatingGlobal(coatingId: string): Promise<unknown> {
    return linkedDeleteCoatingGlobal(this.coatingsRepo, coatingId);
  }

  updateSurfaceFinishLocal(surfaceFinishId: string, payload: SurfaceFinishItemInput): Promise<unknown> {
    return linkedUpdateSurfaceFinishLocal(this.surfaceFinishesRepo, surfaceFinishId, payload);
  }

  updateSurfaceFinishGlobal(surfaceFinishId: string, payload: SurfaceFinishItemInput): Promise<unknown> {
    return linkedUpdateSurfaceFinishGlobal(this.surfaceFinishesRepo, surfaceFinishId, payload);
  }

  deleteSurfaceFinishLocal(surfaceFinishId: string): Promise<unknown> {
    return linkedDeleteSurfaceFinishLocal(this.surfaceFinishesRepo, surfaceFinishId);
  }

  deleteSurfaceFinishGlobal(surfaceFinishId: string): Promise<unknown> {
    return linkedDeleteSurfaceFinishGlobal(this.surfaceFinishesRepo, surfaceFinishId);
  }
}
