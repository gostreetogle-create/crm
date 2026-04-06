import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  TRADE_GOOD_CATEGORIES_REPOSITORY,
  type TradeGoodCategoryInput,
  type TradeGoodCategoryItem,
  type TradeGoodCategoriesRepository,
} from '@srm/trade-goods-data-access';

type State = {
  items: TradeGoodCategoryItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const TradeGoodCategoriesStore = signalStore(
  withState<State>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    tradeGoodCategoriesData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          name: item.name,
          sortOrderLabel: String(item.sortOrder),
          hubLine: item.name,
          isActiveLabel: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
    options: computed(() =>
      items()
        .filter((x) => x.isActive)
        .map((item) => ({ id: item.id, label: item.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    ),
  })),
  withMethods((store, repo = inject<TradeGoodCategoriesRepository>(TRADE_GOOD_CATEGORIES_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить категории товаров',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: TradeGoodCategoryInput; isValid: boolean }>(
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
