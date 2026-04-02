import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import { computeProductionDetailTotals } from '@srm/dictionaries-utils';
import {
  PRODUCTION_DETAILS_REPOSITORY,
  type ProductionDetailItem,
  type ProductionDetailItemInput,
  type ProductionDetailsRepository,
} from '@srm/production-details-data-access';

function displayNameForProductionDetail(item: ProductionDetailItem): string | undefined {
  const n = item.name;
  if (typeof n === 'string' && n.trim()) return n.trim();
  const mat = item.snapshotMaterialName;
  if (typeof mat === 'string' && mat.trim()) return mat.trim();
  const wt = item.snapshotWorkTypeName;
  if (typeof wt === 'string' && wt.trim()) return wt.trim();
  return undefined;
}

function effectiveTotalsForProductionDetail(item: ProductionDetailItem): {
  materialTotalRub: number;
  workTotalRub: number;
  lineTotalRub: number;
} {
  const m = item.materialTotalRub;
  const w = item.workTotalRub;
  const l = item.lineTotalRub;
  if (m != null && w != null && l != null) {
    return { materialTotalRub: m, workTotalRub: w, lineTotalRub: l };
  }
  return computeProductionDetailTotals({
    qty: item.qty != null && item.qty > 0 ? item.qty : 1,
    snapshotPurchasePriceRub: item.snapshotPurchasePriceRub,
    snapshotUnitCode: item.snapshotUnitCode,
    snapshotUnitName: item.snapshotUnitName,
    snapshotDensityKgM3: item.snapshotDensityKgM3,
    snapshotHeightMm: item.snapshotHeightMm,
    snapshotLengthMm: item.snapshotLengthMm,
    snapshotWidthMm: item.snapshotWidthMm,
    snapshotDiameterMm: item.snapshotDiameterMm,
    snapshotThicknessMm: item.snapshotThicknessMm,
    snapshotHourlyRateRub: item.snapshotHourlyRateRub,
    workTimeHours: item.workTimeHours,
  });
}

type ProductionDetailsState = {
  items: ProductionDetailItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const ProductionDetailsStore = signalStore(
  withState<ProductionDetailsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    productionDetailsData: computed(() =>
      items()
        .map((item) => {
          const title = displayNameForProductionDetail(item);
          const totals = effectiveTotalsForProductionDetail(item);
          return {
            id: item.id,
            name: title,
            hubLine: title,
            lineTotalLabel: `${totals.lineTotalRub} ₽`,
            materialTotalLabel: `${totals.materialTotalRub} ₽`,
            workTotalLabel: `${totals.workTotalRub} ₽`,
            isActiveLabel: item.isActive ? 'Да' : 'Нет',
          };
        })
        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<ProductionDetailsRepository>(PRODUCTION_DETAILS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить детали',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: ProductionDetailItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) patchState(store, { formSubmitAttempted: true });
        }),
        filter(({ isValid }) => isValid),
        switchMap(({ value }) => {
          const id = store.editId();
          return id ? repo.update(id, value) : repo.create(value);
        }),
        tap(() => patchState(store, { editId: null, formSubmitAttempted: false })),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items })),
      ),
    ),
    delete: rxMethod<string>(
      pipe(
        switchMap((id) =>
          repo.remove(id).pipe(
            tap(() => {
              if (store.editId() === id) patchState(store, { editId: null, formSubmitAttempted: false });
            }),
          ),
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items })),
      ),
    ),
    createMany: rxMethod<ProductionDetailItemInput[]>(
      pipe(
        switchMap((rows) =>
          from(rows).pipe(
            concatMap((row) => repo.create(row)),
            toArray(),
            tap(() => patchState(store, { editId: null, formSubmitAttempted: false })),
          ),
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items })),
      ),
    ),
    resetForm: () => patchState(store, { editId: null, formSubmitAttempted: false }),
  })),
);
