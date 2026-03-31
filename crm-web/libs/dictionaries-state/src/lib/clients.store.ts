import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import { CLIENTS_REPOSITORY, type ClientItem, type ClientItemInput, type ClientsRepository, formatClientFio } from '@srm/clients-data-access';


type ClientsState = {
  items: ClientItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

export const ClientsStore = signalStore(
  withState<ClientsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    clientsData: computed(() =>
      items()
        .map((item) => {
          const fio = formatClientFio(item);
          return {
            id: item.id,
            hubLine: fio,
            fio,
            email: item.email || '—',
            phone: item.phone || '—',
            isActive: item.isActive ? 'Да' : 'Нет',
          };
        })
        .sort((a, b) => String(a.fio).localeCompare(String(b.fio), 'ru'))
    ),
    options: computed(() =>
      items()
        .filter((x) => x.isActive)
        .map((item) => ({
          id: item.id,
          label: formatClientFio(item),
        }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<ClientsRepository>(CLIENTS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить клиентов',
            }),
        })
      )
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: ClientItemInput; isValid: boolean }>(
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
        tap((items) => patchState(store, { items }))
      )
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
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<ClientItemInput[]>(
      pipe(
        switchMap((rows) =>
          from(rows).pipe(
            concatMap((row) => repo.create(row)),
            toArray(),
            tap(() => patchState(store, { editId: null, formSubmitAttempted: false })),
          ),
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    resetForm: () => patchState(store, { editId: null, formSubmitAttempted: false }),
  }))
);

