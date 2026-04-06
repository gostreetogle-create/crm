import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  TRADE_GOODS_REPOSITORY,
  type TradeGoodItemInput,
  type TradeGoodListItem,
  type TradeGoodsRepository,
} from '@srm/trade-goods-data-access';

type TradeGoodsState = {
  items: TradeGoodListItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const TradeGoodsStore = signalStore(
  withState<TradeGoodsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    tradeGoodsData: computed(() =>
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
            categoryLabel: item.category?.trim() ? item.category.trim() : '—',
            subcategoryLabel: item.subcategory?.trim() ? item.subcategory.trim() : '—',
            unitCodeLabel: item.unitCode?.trim() ? item.unitCode.trim() : '—',
            descriptionLabel: item.description?.trim() ? item.description.trim() : '—',
            productsSummaryLabel: item.productsSummary?.trim() ? item.productsSummary : '—',
            priceLabel: item.priceRub != null ? `${item.priceRub} ₽` : '—',
            costLabel: item.costRub != null ? `${item.costRub} ₽` : '—',
            linesCountLabel: String(item.linesCount),
            notesLabel: item.notes?.trim() ? item.notes.trim() : '—',
            isActiveLabel: item.isActive ? 'Да' : 'Нет',
            compositionLines: item.compositionLines ?? [],
          };
        })
        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<TradeGoodsRepository>(TRADE_GOODS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить товары',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: TradeGoodItemInput; isValid: boolean }>(
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
    applyLoadedItems: (items: TradeGoodListItem[]) =>
      patchState(store, {
        items,
        loading: false,
        error: null,
        editId: null,
        formSubmitAttempted: false,
      }),
  })),
);
