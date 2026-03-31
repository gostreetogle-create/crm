import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import {
  MATERIAL_CHARACTERISTICS_REPOSITORY,
  type MaterialCharacteristicItem,
  type MaterialCharacteristicItemInput,
  type MaterialCharacteristicsRepository,
} from '@srm/material-characteristics-data-access';

type MaterialCharacteristicsState = {
  items: MaterialCharacteristicItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const MaterialCharacteristicsStore = signalStore(
  withState<MaterialCharacteristicsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    materialCharacteristicsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          hubLine: item.code?.trim() ? `${item.name} (${item.code.trim()})` : item.name,
          code: item.code?.trim() || '—',
          densityKgM3: item.densityKgM3 != null ? String(item.densityKgM3) : '—',
          color: item.colorName?.trim() || item.colorHex?.trim() || '—',
          colorHex: item.colorHex?.trim() || '',
          finish: [item.finishType, item.roughnessClass].filter(Boolean).join(' · ') || '—',
          coating: [item.coatingType, item.coatingSpec].filter(Boolean).join(' · ') || '—',
          notes: item.notes?.trim() || '—',
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<MaterialCharacteristicsRepository>(MATERIAL_CHARACTERISTICS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load material characteristics',
            }),
        })
      )
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: MaterialCharacteristicItemInput; isValid: boolean }>(
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
    createMany: rxMethod<MaterialCharacteristicItemInput[]>(
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

