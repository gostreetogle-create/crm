import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import {
  PRODUCTION_WORK_TYPES_REPOSITORY,
  ProductionWorkTypesRepository,
} from '../data/production-work-types.repository';
import { ProductionWorkTypeItem, ProductionWorkTypeItemInput } from '../model/production-work-type-item';

type ProductionWorkTypesState = {
  items: ProductionWorkTypeItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const ProductionWorkTypesStore = signalStore(
  withState<ProductionWorkTypesState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    workTypesData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          hubLine: item.shortLabel?.trim()
            ? `${item.name} · ${item.shortLabel.trim()}`
            : item.name,
          shortLabel: item.shortLabel,
          hourlyRateLabel: `${item.hourlyRateRub} ₽/ч`,
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'))
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<ProductionWorkTypesRepository>(PRODUCTION_WORK_TYPES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить виды работ',
            }),
        })
      )
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: ProductionWorkTypeItemInput; isValid: boolean }>(
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
        tap((items) => patchState(store, { items }))
      )
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
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<ProductionWorkTypeItemInput[]>(
      pipe(
        switchMap((rows) =>
          from(rows).pipe(
            concatMap((row) => repo.create(row)),
            toArray(),
            tap(() => patchState(store, { editId: null, formSubmitAttempted: false })),
          ),
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    resetForm: () => patchState(store, { editId: null, formSubmitAttempted: false }),
  }))
);
