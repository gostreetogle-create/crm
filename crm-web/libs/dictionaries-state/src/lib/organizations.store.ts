import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '@srm/organizations-data-access';
import { OrganizationItem, OrganizationItemInput } from '@srm/organizations-data-access';

type OrganizationsState = {
  items: OrganizationItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

function contactsSummary(item: OrganizationItem): string {
  if (!item.contactLabels.length) return '—';
  return item.contactLabels.join(', ');
}

export const OrganizationsStore = signalStore(
  withState<OrganizationsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(({ items, editId }) => ({
    organizationsData: computed(() =>
      items()
        .map((item) => ({
          id: item.id,
          hubLine: item.shortName?.trim() ? item.shortName.trim() : item.name,
          name: item.name,
          inn: item.inn?.trim() || '—',
          legalForm: item.legalForm?.trim() || '—',
          contacts: contactsSummary(item),
          isActive: item.isActive ? 'Да' : 'Нет',
        }))
        .sort((a, b) => String(a.hubLine).localeCompare(String(b.hubLine), 'ru')),
    ),
    options: computed(() =>
      items()
        .filter((x) => x.isActive)
        .map((item) => ({
          id: item.id,
          label: item.shortName?.trim() ? item.shortName.trim() : item.name,
        }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru')),
    ),
    isEditMode: computed(() => editId() !== null),
  })),
  withMethods((store, repo = inject<OrganizationsRepository>(ORGANIZATIONS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Не удалось загрузить организации',
            }),
        }),
      ),
    ),
    startCreate: () => patchState(store, { editId: null, formSubmitAttempted: false }),
    startEdit: (id: string) => patchState(store, { editId: id, formSubmitAttempted: false }),
    submit: rxMethod<{ value: OrganizationItemInput; isValid: boolean }>(
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
    createMany: rxMethod<OrganizationItemInput[]>(
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


