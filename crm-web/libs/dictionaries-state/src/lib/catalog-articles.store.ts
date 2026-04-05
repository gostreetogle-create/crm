import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  CATALOG_ARTICLES_REPOSITORY,
  type CatalogArticleInput,
  type CatalogArticleItem,
  type CatalogArticlesRepository,
} from '@srm/catalog-suite-data-access';

type CatalogArticlesState = {
  items: CatalogArticleItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const CatalogArticlesStore = signalStore(
  withState<CatalogArticlesState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    catalogArticlesData: computed(() =>
      items()
        .map((item) => {
          const code = item.code?.trim() ?? '';
          const productName = item.product?.name?.trim() ?? '—';
          const hubLine =
            productName !== '—'
              ? `${productName} — ${item.name}`
              : code
                ? `${code} — ${item.name}`
                : item.name;
          return {
            id: item.id,
            name: item.name,
            productId: item.productId,
            hubLine,
            productNameLabel: productName,
            codeLabel: code || '—',
            descriptionLabel: item.description?.trim() ? item.description.trim() : '—',
            qtyLabel: String(item.qty),
            sortOrderLabel: String(item.sortOrder),
            isActiveLabel: item.isActive ? 'Да' : 'Нет',
          };
        })
        .sort((a, b) => {
          const pa = String(a.productNameLabel);
          const pb = String(b.productNameLabel);
          if (pa !== pb) return pa.localeCompare(pb, 'ru');
          const so = Number(a.sortOrderLabel) - Number(b.sortOrderLabel);
          if (so !== 0) return so;
          return String(a.name).localeCompare(String(b.name), 'ru');
        }),
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<CatalogArticlesRepository>(CATALOG_ARTICLES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить позиции каталога',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: CatalogArticleInput; isValid: boolean }>(
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
