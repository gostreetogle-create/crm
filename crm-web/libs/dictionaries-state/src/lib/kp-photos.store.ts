import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import {
  KP_PHOTOS_REPOSITORY,
  type KpPhotoItem,
  type KpPhotoItemInput,
  type KpPhotosRepository,
} from '@srm/kp-photos-data-access';

type KpPhotosState = {
  items: KpPhotoItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const KpPhotosStore = signalStore(
  withState<KpPhotosState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    kpPhotosData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          hubLine: [item.name, item.organizationName].filter(Boolean).join(' · '),
          organizationName: item.organizationName,
          photoTitle: item.photoTitle,
          photoUrl: item.photoUrl,
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
    options: computed(() =>
      items()
        .filter((x) => x.isActive)
        .map((item) => ({
          id: item.id,
          label: `${item.name} — ${item.photoTitle}`,
          organizationId: item.organizationId,
          organizationName: item.organizationName,
          photoUrl: item.photoUrl,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    ),
  })),
  withMethods((store, repo = inject<KpPhotosRepository>(KP_PHOTOS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить фото КП',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: KpPhotoItemInput; isValid: boolean }>(
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
    createMany: rxMethod<KpPhotoItemInput[]>(
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
