import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import { COLORS_REPOSITORY, ColorsRepository } from '../data/colors.repository';
import { ColorItem, ColorItemInput } from '../model/color-item';

export type ColorsState = {
  items: ColorItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const ColorsStore = signalStore(
  withState<ColorsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    colorsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          ralCode: item.ralCode || '—',
          name: item.name,
          hubLine: item.ralCode?.trim()
            ? `${item.ralCode.trim()} · ${item.name}`
            : item.name,
          hex: item.hex,
          rgb: `${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b}`,
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    ),
    options: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          label: `${item.name} ${item.ralCode}`.trim(),
          hex: item.hex,
          name: item.name,
          ralCode: item.ralCode,
        }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<ColorsRepository>(COLORS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load colors',
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
    submit: rxMethod<{ value: ColorItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) {
            patchState(store, { formSubmitAttempted: true });
          }
        }),
        filter(({ isValid }) => isValid),
        switchMap(({ value }) => {
          const id = store.editId();
          const save$ = id ? repo.update(id, value) : repo.create(value);
          return save$;
        }),
        tap(() => patchState(store, { editId: null, formSubmitAttempted: false })),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<ColorItemInput[]>(
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
    delete: rxMethod<string>(
      pipe(
        switchMap((id) =>
          repo.remove(id).pipe(
            tap(() => {
              if (store.editId() === id) {
                patchState(store, { editId: null, formSubmitAttempted: false });
              }
            }),
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
