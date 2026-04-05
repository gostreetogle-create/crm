import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  COMPLEXES_REPOSITORY,
  type ComplexInput,
  type ComplexItem,
  type ComplexesRepository,
} from '@srm/catalog-suite-data-access';

type ComplexesState = {
  items: ComplexItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const ComplexesStore = signalStore(
  withState<ComplexesState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    complexesData: computed(() =>
      items()
        .map((item) => {
          const code = item.code?.trim() ?? '';
          const hubLine = code ? `${code} — ${item.name}` : item.name;
          return {
            id: item.id,
            name: item.name,
            code,
            hubLine,
            codeLabel: code || '—',
            descriptionLabel: item.description?.trim() ? item.description.trim() : '—',
            isActiveLabel: item.isActive ? 'Да' : 'Нет',
          };
        })
        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
    options: computed(() =>
      items()
        .filter((x) => x.isActive)
        .map((item) => ({
          id: item.id,
          label: item.code?.trim() ? `${item.name} (${item.code.trim()})` : item.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    ),
  })),
  withMethods((store, repo = inject<ComplexesRepository>(COMPLEXES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить комплексы',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: ComplexInput; isValid: boolean }>(
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
              if (store.editId() === id) {
                patchState(store, { editId: null, formSubmitAttempted: false });
              }
            }),
          ),
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items })),
      ),
    ),
    resetForm: () => patchState(store, { editId: null, formSubmitAttempted: false }),
  })),
);
