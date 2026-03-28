import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import { COATINGS_REPOSITORY, CoatingsRepository } from '../data/coatings.repository';
import { CoatingItem, CoatingItemInput } from '../model/coating-item';

type CoatingsState = {
  items: CoatingItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const CoatingsStore = signalStore(
  withState<CoatingsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    coatingsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          coatingType: item.coatingType,
          hubLine: [item.coatingType, item.coatingSpec].filter(Boolean).join(' · '),
          coatingSpec: item.coatingSpec,
          thicknessMicron: item.thicknessMicron ?? '—',
        }))
        .sort((a, b) => String(a.coatingType).localeCompare(String(b.coatingType)))
    ),
    options: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          label: `${item.coatingType} / ${item.coatingSpec}`.trim(),
          coatingType: item.coatingType,
          coatingSpec: item.coatingSpec,
          thicknessMicron: item.thicknessMicron,
        }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<CoatingsRepository>(COATINGS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load coatings',
            }),
        })
      )
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: CoatingItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) patchState(store, { formSubmitAttempted: true });
        }),
        filter(({ isValid }) => isValid),
        tap(({ value }) => {
          const id = store.editId();
          if (id) repo.update(id, value);
          else repo.create(value);
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
          if (store.editId() === id) patchState(store, { editId: null, formSubmitAttempted: false });
        }),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<CoatingItemInput[]>(
      pipe(
        tap((rows) => {
          rows.forEach((row) => repo.create(row));
          patchState(store, { editId: null, formSubmitAttempted: false });
        }),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    resetForm: () => patchState(store, { editId: null, formSubmitAttempted: false }),
  }))
);
