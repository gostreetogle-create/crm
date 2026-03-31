import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, take, tap, toArray } from 'rxjs';
import {
  GEOMETRIES_REPOSITORY,
  type GeometriesRepository,
  type GeometryItem,
  type GeometryItemInput,
} from '@srm/geometries-data-access';

import { formatGeometryParamsDisplay } from '@srm/dictionaries-utils';

export type GeometriesState = {
  items: GeometryItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  isEditDialogOpen: boolean;
  formSubmitAttempted: boolean;
};

export const GeometriesStore = signalStore(
  { providedIn: 'root' },
  withState<GeometriesState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    isEditDialogOpen: false,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId, isEditDialogOpen }) => ({
    geometriesData: computed(() =>
      items()
        .map((g) => ({
          id: g.id,
          name: g.name,
          hubLine: `${g.name} — ${formatGeometryParamsDisplay(g)}`,
          shape: g.shapeKey,
          params: formatGeometryParamsDisplay(g),
          isActiveLabel: g.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    ),
    isEditMode: computed(() => editId() !== null && isEditDialogOpen()),
    facts: computed(() => ({
      total: items().length,
      polygons: items().filter((g) => g.shapeKey === 'polygon').length,
    })),
  })),
  withMethods((store, repo = inject<GeometriesRepository>(GEOMETRIES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load geometries',
            }),
        })
      )
    ),
    startCreate: () => {
      patchState(store, {
        editId: null,
        formSubmitAttempted: false,
        isEditDialogOpen: false,
      });
    },
    openEdit: (id: string) => {
      patchState(store, {
        editId: id,
        formSubmitAttempted: false,
        isEditDialogOpen: true,
      });
    },
    closeDialog: () => {
      patchState(store, {
        isEditDialogOpen: false,
        editId: null,
        formSubmitAttempted: false,
      });
    },
    submit: rxMethod<{ value: GeometryItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) {
            patchState(store, { formSubmitAttempted: true });
          }
        }),
        filter(({ isValid }) => isValid),
        switchMap(({ value }) => {
          const id = store.editId();
          if (id) {
            return repo.update(id, value).pipe(
              tap(() =>
                patchState(store, {
                  isEditDialogOpen: false,
                  editId: null,
                  formSubmitAttempted: false,
                }),
              ),
            );
          }
          return repo.create(value).pipe(
            tap(() => patchState(store, { editId: null, formSubmitAttempted: false })),
          );
        }),
        switchMap(() => repo.getItems().pipe(take(1))),
        tap((items) => patchState(store, { items }))
      )
    ),
    delete: rxMethod<string>(
      pipe(
        switchMap((id) =>
          repo.remove(id).pipe(
            tap(() => {
              if (store.editId() === id) {
                patchState(store, {
                  editId: null,
                  formSubmitAttempted: false,
                  isEditDialogOpen: false,
                });
              }
            }),
          ),
        ),
        switchMap(() => repo.getItems().pipe(take(1))),
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<GeometryItemInput[]>(
      pipe(
        switchMap((rows) =>
          from(rows).pipe(
            concatMap((row) => repo.create(row)),
            toArray(),
            tap(() =>
              patchState(store, {
                editId: null,
                formSubmitAttempted: false,
                isEditDialogOpen: false,
              }),
            ),
          ),
        ),
        switchMap(() => repo.getItems().pipe(take(1))),
        tap((items) => patchState(store, { items }))
      )
    ),
    reset: () => {
      patchState(store, {
        editId: null,
        formSubmitAttempted: false,
        isEditDialogOpen: false,
      });
    },
  }))
);

