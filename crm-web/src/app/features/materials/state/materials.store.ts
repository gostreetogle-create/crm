import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  MATERIALS_REPOSITORY,
  MaterialsRepository,
} from '../data/materials.repository';
import { MaterialItem, MaterialItemInput } from '../model/material-item';

export type MaterialsState = {
  items: MaterialItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const MaterialsStore = signalStore(
  withState<MaterialsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    materialsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code || '—',
          densityKgM3: item.densityKgM3 ?? '—',
          color: item.colorName || item.colorHex || '—',
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    ),
    isEditMode: computed(() => editId() !== null),
    facts: computed(() => ({
      total: items().length,
      active: items().filter((m) => m.isActive).length,
    })),
  })),
  withMethods((store, repo = inject<MaterialsRepository>(MATERIALS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load materials',
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
    submit: rxMethod<{ value: MaterialItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) {
            patchState(store, { formSubmitAttempted: true });
          }
        }),
        filter(({ isValid }) => isValid),
        tap(({ value }) => {
          const id = store.editId();
          if (id) {
            repo.update(id, value);
          } else {
            repo.create(value);
          }
          patchState(store, { editId: null, formSubmitAttempted: false });
        }),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    delete: rxMethod<string>(
      pipe(
        tap((id) => {
          repo.remove(id);
          if (store.editId() === id) {
            patchState(store, { editId: null, formSubmitAttempted: false });
          }
        }),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    resetForm: () => {
      patchState(store, { editId: null, formSubmitAttempted: false });
    },
  }))
);
