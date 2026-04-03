import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  PRODUCTS_REPOSITORY,
  type ProductItemInput,
  type ProductListItem,
  type ProductsRepository,
} from '@srm/products-data-access';

type ProductsState = {
  items: ProductListItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const ProductsStore = signalStore(
  withState<ProductsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    productsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          hubLine: item.name,
          detailNamesSummary: item.detailNamesSummary?.trim() ? item.detailNamesSummary : '—',
          workTypesSummary: item.workTypesSummary?.trim() ? item.workTypesSummary : '—',
          colorLabel: item.colorLabel?.trim() ? item.colorLabel : '—',
          priceLabel: item.priceRub != null ? `${item.priceRub} ₽` : '—',
          costLabel: item.costRub != null ? `${item.costRub} ₽` : '—',
          linesCountLabel: String(item.linesCount),
          notesLabel: item.notes?.trim() ? item.notes.trim() : '—',
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
          compositionLines: item.compositionLines ?? [],
        }))
        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<ProductsRepository>(PRODUCTS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить изделия',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: ProductItemInput; isValid: boolean }>(
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
    /** После явного create/update + getItems из компонента (до `location.back()`), чтобы не гоняться с rxMethod submit и вторым loadItems(). */
    applyLoadedItems: (items: ProductListItem[]) =>
      patchState(store, {
        items,
        loading: false,
        error: null,
        editId: null,
        formSubmitAttempted: false,
      }),
  })),
);
