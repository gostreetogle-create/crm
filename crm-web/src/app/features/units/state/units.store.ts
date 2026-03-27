import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import { UNITS_REPOSITORY, UnitsRepository } from '../data/units.repository';
import { UnitItem, UnitItemInput } from '../model/unit-item';

export type UnitsState = {
  items: UnitItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const UnitsStore = signalStore(
  withState<UnitsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    unitsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code || '—',
          notes: item.notes || '—',
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    ),
    isEditMode: computed(() => editId() !== null),
    facts: computed(() => ({
      total: items().length,
      active: items().filter((x) => x.isActive).length,
    })),
  })),
  withMethods((store, repo = inject<UnitsRepository>(UNITS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load units',
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
    submit: rxMethod<{ value: UnitItemInput; isValid: boolean }>(
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
    delete: rxMethod<string>(
      pipe(
        switchMap((id) =>
          repo.remove(id).pipe(
            tap(() => {
              if (store.editId() === id) {
                patchState(store, { editId: null, formSubmitAttempted: false });
              }
            })
          )
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<UnitItemInput[]>(
      pipe(
        switchMap((rows) =>
          from(rows).pipe(
            concatMap((row) => repo.create(row)),
            toArray(),
            tap(() => {
              patchState(store, { editId: null, formSubmitAttempted: false });
            })
          )
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

