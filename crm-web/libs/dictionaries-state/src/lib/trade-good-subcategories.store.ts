import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  TRADE_GOOD_SUBCATEGORIES_REPOSITORY,
  type TradeGoodSubcategoriesRepository,
  type TradeGoodSubcategoryInput,
  type TradeGoodSubcategoryItem,
} from '@srm/trade-goods-data-access';

type State = {
  items: TradeGoodSubcategoryItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const TradeGoodSubcategoriesStore = signalStore(
  withState<State>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    tradeGoodSubcategoriesData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          categoryNameLabel: item.categoryName,
          sortOrderLabel: String(item.sortOrder),
          hubLine: `${item.categoryName} — ${item.name}`,
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.hubLine).localeCompare(String(b.hubLine), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<TradeGoodSubcategoriesRepository>(TRADE_GOOD_SUBCATEGORIES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить подкатегории товаров',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: TradeGoodSubcategoryInput; isValid: boolean }>(
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
