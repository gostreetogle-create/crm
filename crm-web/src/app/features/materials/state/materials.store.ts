import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, filter, from, pipe, switchMap, tap, toArray } from 'rxjs';
import { MaterialCharacteristicsStore } from '../../material-characteristics/state/material-characteristics.store';
import { GeometriesStore } from '../../geometries/state/geometries.store';
import {
  MATERIALS_REPOSITORY,
  MaterialsRepository,
} from '../data/materials.repository';
import { MaterialItem, MaterialItemInput } from '../model/material-item';

export type MaterialsState = {
  items: MaterialItem[];
  loading: boolean;
  error: string | null;
  editId: string | null;
  formSubmitAttempted: boolean;
};

/** Экземпляр только через `providers` маршрута `/materials` (изолированное состояние справочника). */
export const MaterialsStore = signalStore(
  withState<MaterialsState>({
    items: [],
    loading: false,
    error: null,
    editId: null,
    formSubmitAttempted: false,
  }),
  withComputed(
    (
      { items, editId },
      mcStore = inject(MaterialCharacteristicsStore),
      geoStore = inject(GeometriesStore)
    ) => ({
      materialsData: computed(() => {
        const mcById = new Map(mcStore.items().map((x) => [x.id, x]));
        const geoById = new Map(geoStore.items().map((x) => [x.id, x]));
        return items()
          .map((item) => {
            const ch = mcById.get(item.materialCharacteristicId);
            const g = geoById.get(item.geometryId);
            const notes = item.notes?.trim();
            const geomLabel = g?.name ?? item.geometryName ?? '—';
            const charLabel = ch
              ? ch.code?.trim()
                ? `${ch.name} (${ch.code.trim()})`
                : ch.name
              : '—';
            return {
              id: item.id,
              name: item.name,
              hubLine: item.name,
              code: item.code?.trim() || '—',
              characteristic: charLabel,
              geometry: geomLabel,
              unit: item.unitName || '—',
              priceLabel:
                item.purchasePriceRub != null ? `${item.purchasePriceRub} ₽` : '—',
              densityKgM3: ch?.densityKgM3 != null ? String(ch.densityKgM3) : '—',
              color: ch?.colorName?.trim() || ch?.colorHex?.trim() || '—',
              colorHex: ch?.colorHex?.trim() || '',
              finishType: ch?.finishType?.trim() || '—',
              roughnessClass: ch?.roughnessClass?.trim() || '—',
              raMicron: ch?.raMicron != null ? String(ch.raMicron) : '—',
              coatingType: ch?.coatingType?.trim() || '—',
              coatingSpec: ch?.coatingSpec?.trim() || '—',
              coatingThicknessMicron:
                ch?.coatingThicknessMicron != null
                  ? String(ch.coatingThicknessMicron)
                  : '—',
              notes:
                notes && notes.length > 48 ? `${notes.slice(0, 45)}…` : notes || '—',
              isActiveLabel: item.isActive ? 'Да' : 'Нет',
            };
          })
          .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      }),
      isEditMode: computed(() => editId() !== null),
      facts: computed(() => ({
        total: items().length,
        active: items().filter((m) => m.isActive).length,
      })),
    })
  ),
  withMethods((store, repo = inject<MaterialsRepository>(MATERIALS_REPOSITORY)) => ({
    loadItems: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => repo.getItems()),
        tap({
          next: (items) => patchState(store, { items, loading: false }),
          error: (err) =>
            patchState(store, {
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load materials',
            }),
        })
      )
    ),
    startCreate: () => {
      patchState(store, { editId: null, formSubmitAttempted: false });
    },
    startEdit: (id: string) => {
      patchState(store, { editId: id, formSubmitAttempted: false });
    },
    submit: rxMethod<{ value: MaterialItemInput; isValid: boolean }>(
      pipe(
        tap(({ isValid }) => {
          if (!isValid) {
            patchState(store, { formSubmitAttempted: true });
          }
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
              if (store.editId() === id) {
                patchState(store, { editId: null, formSubmitAttempted: false });
              }
            }),
          ),
        ),
        switchMap(() => repo.getItems()),
        tap((items) => patchState(store, { items }))
      )
    ),
    createMany: rxMethod<MaterialItemInput[]>(
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
    resetForm: () => {
      patchState(store, { editId: null, formSubmitAttempted: false });
    },
  }))
);
