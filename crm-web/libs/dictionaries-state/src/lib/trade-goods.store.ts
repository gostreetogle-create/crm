import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  TRADE_GOODS_REPOSITORY,
  type TradeGoodItem,
  type TradeGoodItemInput,
  type TradeGoodListItem,
  type TradeGoodsRepository,
} from '@srm/trade-goods-data-access';

type TradeGoodsState = {
  items: TradeGoodListItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

function asTradeGoodListItem(item: TradeGoodItem): TradeGoodListItem {
  const compositionLines = (item.lines ?? []).map((line) => {
    const productLabel = line.product
      ? (line.product.code?.trim() ? `${line.product.code.trim()} — ${line.product.name}` : line.product.name)
      : line.tradeGood
        ? (line.tradeGood.code?.trim()
            ? `${line.tradeGood.code.trim()} — ${line.tradeGood.name}`
            : line.tradeGood.name)
        : '—';
    return { productLabel, qty: line.qty };
  });
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    categoryId: item.categoryId,
    subcategoryId: item.subcategoryId,
    category: item.category,
    subcategory: item.subcategory,
    unitCode: item.unitCode,
    priceRub: item.priceRub,
    costRub: item.costRub,
    notes: item.notes,
    isActive: item.isActive,
    kind: item.kind,
    photoPrimaryIndex: item.photoPrimaryIndex,
    photoUrls: item.photoUrls ?? [],
    photoUrl: item.photoUrl ?? '',
    linesCount: (item.lines ?? []).length,
    productsSummary: compositionLines.length ? compositionLines.map((x) => (x.qty === 1 ? x.productLabel : `${x.productLabel} ×${x.qty}`)).join('; ') : '—',
    compositionLines,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export const TradeGoodsStore = signalStore(
  withState<TradeGoodsState>({
    items: [],
    loading: false,
    loadingMore: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
    page: 1,
    pageSize: 50,
    total: 0,
    hasMore: false,
  }),
  withComputed(({ items, editId }) => ({
    tradeGoodsData: computed(() =>
      items()
        .map((item) => {
          const code = item.code?.trim() ?? '';
          const kindShort = item.kind === 'COMPLEX' ? 'Комплекс' : 'Товар';
          const hubLine = code ? `${kindShort} · ${code} — ${item.name}` : `${kindShort} · ${item.name}`;
          return {
            id: item.id,
            name: item.name,
            code,
            hubLine,
            kindLabel: item.kind === 'COMPLEX' ? 'Комплекс' : 'Товар',
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
        tap(() => patchState(store, { loading: true, error: null, page: 1 })),
        switchMap(() => repo.getItemsPage(1, store.pageSize())),
        tap({
          next: (resp) =>
            patchState(store, {
              items: resp.data,
              page: resp.page,
              pageSize: resp.pageSize,
              total: resp.total,
              hasMore: resp.page * resp.pageSize < resp.total,
              loading: false,
              loadingMore: false,
            }),
          error: (err) =>
            patchState(store, {
              loading: false,
              loadingMore: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить товары',
            }),
        }),
      ),
    ),
    loadMore: rxMethod<void>(
      pipe(
        filter(() => !store.loading() && !store.loadingMore() && store.hasMore()),
        tap(() => patchState(store, { loadingMore: true, error: null })),
        switchMap(() => repo.getItemsPage(store.page() + 1, store.pageSize())),
        tap({
          next: (resp) => {
            const existing = store.items();
            const merged = [...existing];
            const seen = new Set(existing.map((x) => x.id));
            for (const item of resp.data) {
              if (seen.has(item.id)) continue;
              seen.add(item.id);
              merged.push(item);
            }
            patchState(store, {
              items: merged,
              page: resp.page,
              pageSize: resp.pageSize,
              total: resp.total,
              hasMore: resp.page * resp.pageSize < resp.total,
              loadingMore: false,
            });
          },
          error: (err) =>
            patchState(store, {
              loadingMore: false,
              error: err instanceof Error ? err.message : 'Не удалось дозагрузить товары',
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
        tap((saved) => {
          const listItem = asTradeGoodListItem(saved);
          const current = store.items();
          const existingIndex = current.findIndex((x) => x.id === listItem.id);
          const nextItems =
            existingIndex >= 0
              ? current.map((x) => (x.id === listItem.id ? listItem : x))
              : [listItem, ...current];
          const nextTotal = existingIndex >= 0 ? store.total() : store.total() + 1;
          patchState(store, {
            items: nextItems,
            total: nextTotal,
            hasMore: store.page() * store.pageSize() < nextTotal,
            editId: null,
            formSubmitAttempted: false,
          });
        }),
      ),
    ),
    delete: rxMethod<string>(
      pipe(
        switchMap((id) =>
          repo.remove(id).pipe(
            tap(() => {
              const filtered = store.items().filter((item) => item.id !== id);
              const nextTotal = Math.max(0, store.total() - 1);
              if (store.editId() === id) {
                patchState(store, {
                  items: filtered,
                  total: nextTotal,
                  hasMore: store.page() * store.pageSize() < nextTotal,
                  editId: null,
                  formSubmitAttempted: false,
                });
                return;
              }
              patchState(store, {
                items: filtered,
                total: nextTotal,
                hasMore: store.page() * store.pageSize() < nextTotal,
              });
            }),
          ),
        ),
      ),
    ),
    resetForm: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    applyLoadedItems: (items: TradeGoodListItem[]) =>
      patchState(store, {
        items,
        loading: false,
        loadingMore: false,
        error: null,
        editId: null,
        formSubmitAttempted: false,
        page: 1,
        pageSize: store.pageSize(),
        total: items.length,
        hasMore: false,
      }),
  })),
);
