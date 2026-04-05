import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  CATALOG_PRODUCTS_REPOSITORY,
  type CatalogProductInput,
  type CatalogProductItem,
  type CatalogProductsRepository,
} from '@srm/catalog-suite-data-access';

type CatalogProductsState = {
  items: CatalogProductItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const CatalogProductsStore = signalStore(
  withState<CatalogProductsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    catalogProductsData: computed(() =>
      items()
        .map((item) => {
          const code = item.code?.trim() ?? '';
          const complexName = item.complex?.name?.trim() ?? '—';
          const hubLine =
            complexName !== '—'
              ? `${complexName} — ${item.name}`
              : code
                ? `${code} — ${item.name}`
                : item.name;
          return {
            id: item.id,
            name: item.name,
            complexId: item.complexId,
            hubLine,
            complexNameLabel: complexName,
            codeLabel: code || '—',
            descriptionLabel: item.description?.trim() ? item.description.trim() : '—',
            priceLabel: `${item.price} ₽`,
            isActiveLabel: item.isActive ? 'Да' : 'Нет',
          };
        })
        .sort((a, b) => {
          const ca = String(a.complexNameLabel);
          const cb = String(b.complexNameLabel);
          if (ca !== cb) return ca.localeCompare(cb, 'ru');
          return String(a.name).localeCompare(String(b.name), 'ru');
        }),
    ),
    isEditMode: computed(() => editId() !== null),
    options: computed(() =>
      items()
        .filter((x) => x.isActive)
        .map((item) => ({
          id: item.id,
          label: item.complex?.name
            ? `${item.name} (${item.complex.name})`
            : item.code?.trim()
              ? `${item.name} (${item.code.trim()})`
              : item.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    ),
  })),
  withMethods((store, repo = inject<CatalogProductsRepository>(CATALOG_PRODUCTS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить каталожные товары',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: CatalogProductInput; isValid: boolean }>(
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
