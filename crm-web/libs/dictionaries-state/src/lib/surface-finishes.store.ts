import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import {
  SURFACE_FINISHES_REPOSITORY,
  type SurfaceFinishItem,
  type SurfaceFinishItemInput,
  type SurfaceFinishesRepository,
} from '@srm/surface-finishes-data-access';


export type SurfaceFinishesState = {
  items: SurfaceFinishItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const SurfaceFinishesStore = signalStore(
  withState<SurfaceFinishesState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    surfaceFinishesData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          finishType: item.finishType,
          hubLine: [item.finishType, item.roughnessClass].filter(Boolean).join(' · '),
          roughnessClass: item.roughnessClass,
          raMicron: item.raMicron ?? '—',
        }))
        .sort((a, b) => String(a.finishType).localeCompare(String(b.finishType)))
    ),
    options: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          label: `${item.finishType} / ${item.roughnessClass}`.trim(),
          finishType: item.finishType,
          roughnessClass: item.roughnessClass,
          raMicron: item.raMicron,
        }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<SurfaceFinishesRepository>(SURFACE_FINISHES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load surface finishes',
            }),
        })
      )
    ),
    startCreate: () => {
      patchState(store, { editId: null, formSubmitAttempted: false });
    },
    startEdit: (id: string) => {
      patchState(store, { editId: id, formSubmitAttempted: false });
    },
    submit: rxMethod<{ value: SurfaceFinishItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) {
            patchState(store, { formSubmitAttempted: true });
          }
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
    createMany: rxMethod<SurfaceFinishItemInput[]>(
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
    resetForm: () => {
      patchState(store, { editId: null, formSubmitAttempted: false });
    },
  }))
);

