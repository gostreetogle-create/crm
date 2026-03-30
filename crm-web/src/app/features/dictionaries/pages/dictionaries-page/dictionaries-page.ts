import { DOCUMENT, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, Subscription, firstValueFrom, forkJoin, of } from 'rxjs';
import { PermissionsService } from '../../../../core/auth/public-api';
import { permissionKeyForDictionaryHubTile } from '../../../../core/auth/dict-hub-permissions';
import { GeometriesStore } from '../../../geometries/state/geometries.store';
import {
  GEOMETRY_DIAMETER_LABEL,
  GeometryDimKey,
  isGeometryDimensionRequired,
  isGeometryDimensionVisible,
} from '../../../geometries/utils/geometry-shape-config';
import { formatGeometryParamsDisplay } from '../../../geometries/utils/format-geometry-params-display';
import { MaterialItem, MaterialItemInput } from '../../../materials/model/material-item';
import { MaterialsStore } from '../../../materials/state/materials.store';
import { UnitsStore } from '../../../units/state/units.store';
import { ColorsStore } from '../../../colors/state/colors.store';
import { CoatingsStore } from '../../../coatings/state/coatings.store';
import { SurfaceFinishesStore } from '../../../surface-finishes/state/surface-finishes.store';
import { ProductionWorkTypesStore } from '../../../production-work-types/state/production-work-types.store';
import { ClientsStore } from '../../../clients/state/clients.store';
import { ClientItemInput } from '../../../clients/model/client-item';
import {
  MATERIAL_CHARACTERISTICS_REPOSITORY,
  MaterialCharacteristicsRepository,
} from '../../../material-characteristics/data/material-characteristics.repository';
import {
  MaterialCharacteristicItem,
  MaterialCharacteristicItemInput,
} from '../../../material-characteristics/model/material-characteristic-item';
import { MaterialCharacteristicsStore } from '../../../material-characteristics/state/material-characteristics.store';
import { COLORS_REPOSITORY } from '../../../colors/data/colors.repository';
import { COATINGS_REPOSITORY } from '../../../coatings/data/coatings.repository';
import { SURFACE_FINISHES_REPOSITORY } from '../../../surface-finishes/data/surface-finishes.repository';
import {
  MaterialCharacteristicsImportDraftRow,
  MissingReferencePlan,
  ReferenceSnapshot,
  materialCharacteristicsDraftsToPayload,
  planMissingReferencesForMaterialCharacteristicsImport,
} from '../../../material-characteristics/utils/material-characteristics-excel-import';
import { RolesStore } from '../../../roles/state/roles.store';
import { RoleItemInput } from '../../../roles/model/role-item';
import { ROLE_ID_SYSTEM_ADMIN } from '../../../roles/data/roles.seed';
import { nextRoleSortOrder } from '../../../roles/utils/role-sort';
import { allocateUniqueRoleCode, slugifyRoleCodeFromName } from '../../../roles/utils/role-code-slug';
import { UsersStore } from '../../../users/state/users.store';
import { UserItemInput } from '../../../users/model/user-item';
import { CrudLayoutComponent, TableColumn } from '../../../../shared/ui/crud-layout/public-api';
import { UiFormGridComponent } from '../../../../shared/ui/form-grid/public-api';
import { UiModal as UiModalComponent } from '../../../../shared/ui/modal/public-api';
import { UiModalFormActionsComponent } from '../../../../shared/ui/modal-form-actions/public-api';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiCheckboxFieldComponent } from '../../../../shared/ui/ui-checkbox-field/ui-checkbox-field.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';
import { HexRgbFieldComponent } from '../../../../shared/ui/hex-rgb-field/public-api';
import { HubCrudExpandStateService } from '../../../../shared/ui/hub-crud-expandable/public-api';
import { DictionaryHubTileFullscreenComponent } from '../../../../shared/ui/cards/public-api';
import { LinkedDictionaryPropagationConfirmComponent } from '../../../../shared/ui/linked-dictionary-propagation-confirm/public-api';

@Component({
  selector: 'app-dictionaries-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    PageShellComponent,
    DictionaryHubTileFullscreenComponent,
    CrudLayoutComponent,
    UiModalComponent,
    UiModalFormActionsComponent,
    UiFormGridComponent,
    UiButtonComponent,
    UiCheckboxFieldComponent,
    UiFormFieldComponent,
    HexRgbFieldComponent,
    LucidePlus,
    LinkedDictionaryPropagationConfirmComponent,
  ],
  templateUrl: './dictionaries-page.html',
  styleUrl: './dictionaries-page.scss',
})
export class DictionariesPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly doc = inject(DOCUMENT);
  private readonly sub = new Subscription();

  /**
   * Гейт для автосинхронизации read-only snapshot-полей в модалке
   * "Характеристика материала" из справочников.
   *
   * Смысл:
   * - при выборе "Изменить локально" мы НЕ хотим перезаписывать исторические snapshot-поля,
   *   - при выборе "Изменить во всех связанных" хотим обновить snapshot-поля.
   *
   * Важно: это обычные поля, не сигналы. Поэтому смена гейта не перезапускает effect,
   * а эффект срабатывает только на изменениях стор/опций.
   */
  private readonly materialsSnapshotSyncGate: {
    color: 'local' | 'global' | null;
    surfaceFinish: 'local' | 'global' | null;
    coating: 'local' | 'global' | null;
  } = { color: null, surfaceFinish: null, coating: null };

  readonly permissions = inject(PermissionsService);
  readonly hubTilePerm = permissionKeyForDictionaryHubTile;

  /** Заголовок раздела хаба показываем только если есть хотя бы одна плитка в разделе. */
  hubSectionVisible(tileKeys: readonly string[]): boolean {
    return tileKeys.some((key) => this.permissions.can(this.hubTilePerm(key)));
  }

  readonly hubExpand = inject(HubCrudExpandStateService);
  readonly rolesStore = inject(RolesStore);
  readonly usersStore = inject(UsersStore);
  readonly materialsStore = inject(MaterialsStore);
  readonly geometriesStore = inject(GeometriesStore);
  readonly unitsStore = inject(UnitsStore);
  readonly colorsStore = inject(ColorsStore);
  readonly coatingsStore = inject(CoatingsStore);
  readonly surfaceFinishesStore = inject(SurfaceFinishesStore);
  readonly productionWorkTypesStore = inject(ProductionWorkTypesStore);
  readonly clientsStore = inject(ClientsStore);
  readonly materialCharacteristicsStore = inject(MaterialCharacteristicsStore);
  private readonly colorsRepository = inject(COLORS_REPOSITORY);
  private readonly surfaceFinishesRepository = inject(SURFACE_FINISHES_REPOSITORY);
  private readonly coatingsRepository = inject(COATINGS_REPOSITORY);
  private readonly materialCharacteristicsRepository = inject<MaterialCharacteristicsRepository>(
    MATERIAL_CHARACTERISTICS_REPOSITORY
  );

  readonly isWorkTypesModalOpen = signal(false);
  readonly isMaterialCharacteristicsModalOpen = signal(false);
  readonly isMaterialCharacteristicsViewMode = signal(false);
  readonly isMaterialsModalOpen = signal(false);
  readonly isGeometriesModalOpen = signal(false);
  readonly isUnitsModalOpen = signal(false);
  readonly isColorsModalOpen = signal(false);
  readonly isCoatingsModalOpen = signal(false);
  readonly coatingsEditingId = signal<string | null>(null);
  readonly isCoatingPropagationConfirmOpen = signal(false);
  readonly coatingPropagationPlan = signal<
    | null
    | {
        coatingId: string;
        payload: { coatingType: string; coatingSpec: string; thicknessMicron: number | undefined };
        relatedCount: number;
      }
  >(null);
  readonly isCoatingDeletePropagationConfirmOpen = signal(false);
  readonly coatingDeletePropagationPlan = signal<{ coatingId: string; relatedCount: number } | null>(null);

  readonly colorsEditingId = signal<string | null>(null);
  readonly isColorPropagationConfirmOpen = signal(false);
  readonly colorPropagationPlan = signal<
    | null
    | {
        colorId: string;
        payload: { ralCode?: string; name: string; hex: string; rgb: { r: number; g: number; b: number } };
        relatedCount: number;
      }
  >(null);
  readonly isColorDeletePropagationConfirmOpen = signal(false);
  readonly colorDeletePropagationPlan = signal<{ colorId: string; relatedCount: number } | null>(null);

  readonly surfaceFinishesEditingId = signal<string | null>(null);
  readonly isSurfaceFinishPropagationConfirmOpen = signal(false);
  readonly surfaceFinishPropagationPlan = signal<
    | null
    | {
        surfaceFinishId: string;
        payload: { finishType: string; roughnessClass: string; raMicron: number | undefined };
        relatedCount: number;
      }
  >(null);
  readonly isSurfaceFinishDeletePropagationConfirmOpen = signal(false);
  readonly surfaceFinishDeletePropagationPlan = signal<
    { surfaceFinishId: string; relatedCount: number } | null
  >(null);
  readonly isClientsModalOpen = signal(false);
  readonly isSurfaceFinishesModalOpen = signal(false);
  readonly isMaterialsViewMode = signal(false);
  readonly isGeometriesViewMode = signal(false);
  readonly isUnitsViewMode = signal(false);
  readonly isColorsViewMode = signal(false);
  readonly isCoatingsViewMode = signal(false);
  readonly isClientsViewMode = signal(false);
  readonly isSurfaceFinishesViewMode = signal(false);
  readonly isWorkTypesViewMode = signal(false);
  readonly isRolesModalOpen = signal(false);
  readonly isRolesViewMode = signal(false);
  readonly rolesEditingId = signal<string | null>(null);
  readonly isUsersModalOpen = signal(false);
  readonly isUsersViewMode = signal(false);
  readonly usersEditingId = signal<string | null>(null);
  readonly colorQuickAddForMaterialCharacteristics = signal(false);
  readonly unitQuickAddForMaterials = signal(false);
  readonly coatingQuickAddForMaterialCharacteristics = signal(false);
  readonly surfaceQuickAddForMaterialCharacteristics = signal(false);
  readonly excelImportStatus = signal('');

  /** Подсказка для раскраски баннера Excel на хабе. */
  readonly excelImportTone = computed((): 'info' | 'success' | 'error' => {
    const s = this.excelImportStatus();
    if (!s) return 'info';
    if (
      /Импорт отклонен|Импорт отмен|не удалось сформировать|не удалось прочитать|не удалось сопоставить|не удалось собрать/i.test(
        s
      )
    ) {
      return 'error';
    }
    if (/Чтение и проверка файла|которых нет в малых справочниках/i.test(s)) return 'info';
    return 'success';
  });

  /** Подтверждение: добавить отсутствующие в малых справочниках позиции перед импортом характеристик. */
  readonly mcImportAssistOpen = signal(false);
  readonly mcImportAssistLines = signal<string[]>([]);
  private mcImportPendingPlan: MissingReferencePlan | null = null;
  private mcImportPendingDrafts: MaterialCharacteristicsImportDraftRow[] = [];

  /** На хабе одна колонка hubLine; короткий заголовок колонки по смыслу справочника (см. naming convention). */
  readonly workTypesColumns: TableColumn[] = [{ key: 'hubLine', label: 'Вид работ' }];

  /** Full-view для раскрытия: показываем все значимые поля строки. */
  readonly workTypesColumnsFull: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'shortLabel', label: 'Коротко' },
    { key: 'hourlyRateLabel', label: 'Ставка ₽/ч' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly materialCharacteristicsColumnsPreview: TableColumn[] = [
    { key: 'hubLine', label: 'Характеристика' },
  ];

  readonly materialCharacteristicsColumnsFull: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'densityKgM3', label: 'Плотность' },
    { key: 'color', label: 'Цвет', swatchHexKey: 'colorHex' },
    { key: 'finish', label: 'Отделка' },
    { key: 'coating', label: 'Покрытие' },
    { key: 'notes', label: 'Заметка' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly materialsColumnsPreview: TableColumn[] = [{ key: 'hubLine', label: 'Материал' }];

  /** Широкая плитка материалов: все основные поля строкой таблицы (не одна склейка hubLine). */
  readonly materialsColumnsFull: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'characteristic', label: 'Характеристика' },
    { key: 'geometry', label: 'Геометрия' },
    { key: 'unit', label: 'Ед.' },
    { key: 'priceLabel', label: 'Цена' },
    { key: 'densityKgM3', label: 'Плотность' },
    { key: 'color', label: 'Цвет', swatchHexKey: 'colorHex' },
    { key: 'finishType', label: 'Отделка' },
    { key: 'roughnessClass', label: 'Шерох.' },
    { key: 'raMicron', label: 'Ra, мкм' },
    { key: 'coatingType', label: 'Покрытие' },
    { key: 'coatingSpec', label: 'Спецификация' },
    { key: 'coatingThicknessMicron', label: 'Толщ., мкм' },
    { key: 'notes', label: 'Заметка' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly geometriesColumns: TableColumn[] = [{ key: 'hubLine', label: 'Профиль' }];

  /** Full-view для раскрытия geometries. */
  readonly geometriesColumnsFull: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'shape', label: 'Форма' },
    { key: 'params', label: 'Параметры' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly unitsColumns: TableColumn[] = [{ key: 'hubLine', label: 'Ед. изм.' }];

  /** Full-view для раскрытия units. */
  readonly unitsColumnsFull: TableColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'notes', label: 'Заметка' },
    { key: 'isActiveLabel', label: 'Активен' },
  ];

  readonly colorsColumns: TableColumn[] = [{ key: 'hubLine', label: 'Цвет', swatchHexKey: 'hex' }];

  /** Full-view для раскрытия colors. */
  readonly colorsColumnsFull: TableColumn[] = [
    { key: 'ralCode', label: 'Код RAL' },
    { key: 'name', label: 'Название' },
    { key: 'hex', label: 'HEX', swatchHexKey: 'hex' },
    { key: 'rgb', label: 'RGB' },
  ];

  readonly surfaceFinishesColumns: TableColumn[] = [{ key: 'hubLine', label: 'Отделка' }];

  /** Full-view для раскрытия surface finishes. */
  readonly surfaceFinishesColumnsFull: TableColumn[] = [
    { key: 'finishType', label: 'Отделка' },
    { key: 'roughnessClass', label: 'Шероховатость' },
    { key: 'raMicron', label: 'Ra, мкм' },
  ];

  readonly coatingsColumns: TableColumn[] = [{ key: 'hubLine', label: 'Покрытие' }];

  /** Full-view для раскрытия coatings. */
  readonly coatingsColumnsFull: TableColumn[] = [
    { key: 'coatingType', label: 'Тип покрытия' },
    { key: 'coatingSpec', label: 'Спецификация' },
    { key: 'thicknessMicron', label: 'Толщ., мкм' },
  ];

  readonly clientsColumns: TableColumn[] = [{ key: 'hubLine', label: 'ФИО' }];

  /** Full-view для раскрытия clients. */
  readonly clientsColumnsFull: TableColumn[] = [
    { key: 'fio', label: 'ФИО' },
    { key: 'clientMarkupPercent', label: 'Наценка' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Телефон' },
    { key: 'isActive', label: 'Активен' },
  ];

  /** Как у остальных узких плиток хаба: одна колонка превью, раскрытие — полная таблица. */
  readonly rolesColumns: TableColumn[] = [{ key: 'hubLine', label: 'Роль' }];

  /** Full-view для раскрытия roles. */
  readonly rolesColumnsFull: TableColumn[] = [
    { key: 'hubLine', label: 'Роль' },
    { key: 'code', label: 'Код' },
    { key: 'notes', label: 'Заметки' },
    { key: 'isActiveLabel', label: 'Активна' },
    { key: 'isSystemLabel', label: 'Системная' },
  ];

  readonly usersColumns: TableColumn[] = [{ key: 'hubLine', label: 'Пользователь' }];

  /** Full-view для раскрытия users. */
  readonly usersColumnsFull: TableColumn[] = [
    { key: 'hubLine', label: 'Пользователь' },
    { key: 'login', label: 'Логин' },
    { key: 'roleLabel', label: 'Роль' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Телефон' },
  ];

  /**
   * Узкие плитки с `app-dictionary-hub-tile-fullscreen`: в свёрнутом виде — одна колонка превью (без горизонтального скролла),
   * после раскрытия — полный набор полей.
   */
  private readonly columnsForTile = <T extends TableColumn>(
    tileKey: string,
    shortCols: T[],
    fullCols: T[],
  ) =>
    computed((): T[] => [...(this.hubExpand.isOpen(tileKey) ? fullCols : shortCols)]);

  /**
   * В свернутой карточке скрываем строки таблицы (0),
   * в раскрытой — штатный лимит из HubCrudExpandStateService.
   */
  previewRows(tileKey: string): number | null {
    return this.hubExpand.isOpen(tileKey) ? this.hubExpand.previewMaxTableBodyRows(tileKey) : 0;
  }

  readonly workTypesColumnsForTile = this.columnsForTile('workTypes', this.workTypesColumns, this.workTypesColumnsFull);
  readonly unitsColumnsForTile = this.columnsForTile('units', this.unitsColumns, this.unitsColumnsFull);
  readonly clientsColumnsForTile = this.columnsForTile('clients', this.clientsColumns, this.clientsColumnsFull);
  readonly colorsColumnsForTile = this.columnsForTile('colors', this.colorsColumns, this.colorsColumnsFull);
  readonly surfaceFinishesColumnsForTile = this.columnsForTile(
    'surfaceFinishes',
    this.surfaceFinishesColumns,
    this.surfaceFinishesColumnsFull,
  );
  readonly geometriesColumnsForTile = this.columnsForTile('geometries', this.geometriesColumns, this.geometriesColumnsFull);
  readonly coatingsColumnsForTile = this.columnsForTile('coatings', this.coatingsColumns, this.coatingsColumnsFull);
  readonly rolesColumnsForTile = this.columnsForTile('roles', this.rolesColumns, this.rolesColumnsFull);
  readonly usersColumnsForTile = this.columnsForTile('users', this.usersColumns, this.usersColumnsFull);

  readonly materialsColumnsForTile = this.columnsForTile(
    'materials',
    this.materialsColumnsPreview,
    this.materialsColumnsFull,
  );
  readonly materialCharacteristicsColumnsForTile = this.columnsForTile(
    'materialCharacteristics',
    this.materialCharacteristicsColumnsPreview,
    this.materialCharacteristicsColumnsFull,
  );

  /** Активные роли для поля «Роль» в карточке пользователя. */
  readonly roleSelectOptions = computed(() =>
    this.rolesStore.matrixRoleColumns().map((r) => ({
      id: r.id,
      label: r.name,
    })),
  );

  readonly materialCharacteristicSelectOptions = computed(() =>
    [...this.materialCharacteristicsStore.items()]
      .filter((x) => x.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => ({
        id: x.id,
        label: x.code?.trim() ? `${x.name} (${x.code.trim()})` : x.name,
      })),
  );

  readonly geometrySelectOptions = computed(() =>
    [...this.geometriesStore.items()]
      .filter((g) => g.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g) => ({
        id: g.id,
        label: `${g.name} — ${formatGeometryParamsDisplay(g)}`,
      })),
  );

  readonly workTypesForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shortLabel: ['', [Validators.required, Validators.minLength(1)]],
    hourlyRateRub: [0, [Validators.required, Validators.min(1)]],
    isActive: [true],
  });

  readonly materialsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    materialCharacteristicId: ['', Validators.required],
    geometryId: ['', Validators.required],
    unitId: ['', Validators.required],
    purchasePriceRub: [0, [Validators.required, Validators.min(1)]],
    notes: [''],
    isActive: [true],
  });

  readonly materialCharacteristicsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    densityKgM3: [null as number | null],
    colorId: [''],
    colorName: [''],
    colorHex: [''],
    surfaceFinishId: [''],
    finishType: [''],
    roughnessClass: [''],
    raMicron: [null as number | null],
    coatingId: [''],
    coatingType: [''],
    coatingSpec: [''],
    coatingThicknessMicron: [null as number | null],
    notes: [''],
    isActive: [true],
  });

  readonly shapeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'rectangular', label: 'Прямоугольная' },
    { value: 'cylindrical', label: 'Цилиндрическая' },
    { value: 'tube', label: 'Труба' },
    { value: 'plate', label: 'Лист' },
    { value: 'custom', label: 'Произвольная' },
  ];

  readonly geometryDiameterFieldLabel = GEOMETRY_DIAMETER_LABEL;

  readonly geometriesForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shapeKey: ['rectangular', Validators.required],
    heightMm: [null as number | null, [Validators.min(0)]],
    lengthMm: [null as number | null, [Validators.min(0)]],
    widthMm: [null as number | null, [Validators.min(0)]],
    diameterMm: [null as number | null, [Validators.min(0)]],
    thicknessMm: [null as number | null, [Validators.min(0)]],
    notes: [''],
    isActive: [true],
  });

  readonly unitsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    code: ['', [Validators.required, Validators.minLength(2)]],
    notes: [''],
    isActive: [true],
  });

  readonly rolesForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sortOrder: [1, [Validators.required, Validators.min(1), Validators.max(999_999)]],
    notes: [''],
    isActive: [true],
  });

  readonly usersForm = this.fb.nonNullable.group({
    login: ['', [Validators.required, Validators.minLength(2)]],
    password: [''],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.email]],
    phone: [''],
    roleId: ['', Validators.required],
  });

  readonly colorsForm = this.fb.nonNullable.group({
    ralCode: ['RAL ', [this.ralCodeValidator]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    hex: ['#000000', [Validators.required, Validators.pattern(/^#([A-Fa-f0-9]{6})$/)]],
  });

  readonly surfaceFinishesForm = this.fb.nonNullable.group({
    finishType: ['', [Validators.required, Validators.minLength(2)]],
    roughnessClass: ['', [Validators.required, Validators.minLength(2)]],
    raMicron: [null as number | null, [Validators.min(0)]],
  });

  readonly coatingsForm = this.fb.nonNullable.group({
    coatingType: ['', [Validators.required, Validators.minLength(2)]],
    coatingSpec: ['', [Validators.required, Validators.minLength(2)]],
    thicknessMicron: [null as number | null, [Validators.min(0)]],
  });

  readonly clientsForm = this.fb.nonNullable.group({
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    patronymic: [''],
    address: [''],
    phone: [''],
    email: [''],
    notes: [''],
    /** Пусто в UI = null; диапазон проверяем при отправке. */
    clientMarkupPercent: [null as number | null],
    passportSeries: [''],
    passportNumber: [''],
    passportIssuedBy: [''],
    passportIssuedDate: [''],
    isActive: [true],
  });

  constructor() {
    // Русское название в заголовке вкладки браузера.
    this.doc.title = 'Справочники — CRM';

    // Если открыта модалка редактирования «Материал характеристик», а пользователь
    // в другой вкладке/модалке поменял справочник (Color/SurfaceFinish/Coating),
    // то readonly-«Из справочников» поля должны обновляться автоматически.
    effect(() => {
      if (!this.isMaterialCharacteristicsModalOpen()) return;
      // Триггерим подписку на изменения справочника.
      this.colorsStore.options();
      const colorId = this.materialCharacteristicsForm.controls.colorId.value;
      const gate = this.materialsSnapshotSyncGate.color;
      if (gate !== 'global') {
        // По умолчанию (gate === null) snapshot-поля считаем историей и не трогаем.
        if (gate === 'local') this.materialsSnapshotSyncGate.color = null;
        return;
      }

      // Только "во всех связанных" приводит к обновлению snapshot-полей.
      this.materialsSnapshotSyncGate.color = null;
      this.syncMaterialCharacteristicColorFromReference(colorId ? String(colorId) : '');
    });
    effect(() => {
      if (!this.isMaterialCharacteristicsModalOpen()) return;
      this.surfaceFinishesStore.options();
      const surfaceFinishId = this.materialCharacteristicsForm.controls.surfaceFinishId.value;
      const gate = this.materialsSnapshotSyncGate.surfaceFinish;
      if (gate !== 'global') {
        if (gate === 'local') this.materialsSnapshotSyncGate.surfaceFinish = null;
        return;
      }

      this.materialsSnapshotSyncGate.surfaceFinish = null;
      this.syncMaterialCharacteristicFinishFromReference(surfaceFinishId ? String(surfaceFinishId) : '');
    });
    effect(() => {
      if (!this.isMaterialCharacteristicsModalOpen()) return;
      this.coatingsStore.options();
      const coatingId = this.materialCharacteristicsForm.controls.coatingId.value;
      const gate = this.materialsSnapshotSyncGate.coating;
      if (gate !== 'global') {
        if (gate === 'local') this.materialsSnapshotSyncGate.coating = null;
        return;
      }

      this.materialsSnapshotSyncGate.coating = null;
      this.syncMaterialCharacteristicCoatingFromReference(coatingId ? String(coatingId) : '');
    });

    this.materialsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.geometriesStore.loadItems();
    this.unitsStore.loadItems();
    this.colorsStore.loadItems();
    this.coatingsStore.loadItems();
    this.surfaceFinishesStore.loadItems();
    this.productionWorkTypesStore.loadItems();
    this.clientsStore.loadItems();

    this.sub.add(
      this.workTypesForm.controls.name.valueChanges.subscribe(() => {
        const c = this.workTypesForm.controls.name;
        const err = c.errors;
        if (err?.['duplicate']) {
          const { duplicate: _d, ...rest } = err;
          c.setErrors(Object.keys(rest).length ? rest : null);
        }
      })
    );

    this.applyGeometryShapeValidators(this.geometriesForm.controls.shapeKey.value);
    this.sub.add(
      this.geometriesForm.controls.shapeKey.valueChanges.subscribe((shape) => {
        this.applyGeometryShapeValidators(shape);
      })
    );
    this.sub.add(
      this.materialCharacteristicsForm.controls.colorId.valueChanges.subscribe((id) => {
        this.syncMaterialCharacteristicColorFromReference(id ?? '');
      })
    );
    this.sub.add(
      this.materialCharacteristicsForm.controls.surfaceFinishId.valueChanges.subscribe((id) => {
        this.syncMaterialCharacteristicFinishFromReference(id ?? '');
      })
    );
    this.sub.add(
      this.materialCharacteristicsForm.controls.coatingId.valueChanges.subscribe((id) => {
        this.syncMaterialCharacteristicCoatingFromReference(id ?? '');
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  openWorkTypesCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isWorkTypesViewMode.set(false);
    this.workTypesForm.enable({ emitEvent: false });
    this.productionWorkTypesStore.startCreate();
    this.workTypesForm.reset({
      name: '',
      shortLabel: '',
      hourlyRateRub: 0,
      isActive: true,
    });
    this.isWorkTypesModalOpen.set(true);
  }

  openWorkTypesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isWorkTypesViewMode.set(false);
    this.workTypesForm.enable({ emitEvent: false });
    const item = this.productionWorkTypesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.productionWorkTypesStore.startEdit(item.id);
    this.workTypesForm.reset({
      name: item.name ?? '',
      shortLabel: item.shortLabel ?? '',
      hourlyRateRub: item.hourlyRateRub,
      isActive: item.isActive,
    });
    this.isWorkTypesModalOpen.set(true);
  }

  closeWorkTypesModal(): void {
    this.productionWorkTypesStore.resetForm();
    this.isWorkTypesViewMode.set(false);
    this.isWorkTypesModalOpen.set(false);
  }

  submitWorkTypes(): void {
    const payload = this.buildWorkTypesPayload();
    const nameCtrl = this.workTypesForm.controls.name;
    if (this.workTypesForm.invalid) {
      this.productionWorkTypesStore.submit({ value: payload, isValid: false });
      this.workTypesForm.markAllAsTouched();
      return;
    }
    const nameKey = this.normalizeWorkTypeName(payload.name);
    const editId = this.productionWorkTypesStore.editId();
    const hasDup = this.productionWorkTypesStore
      .items()
      .some((x) => x.id !== editId && this.normalizeWorkTypeName(x.name) === nameKey);
    if (hasDup) {
      nameCtrl.setErrors({ ...(nameCtrl.errors ?? {}), duplicate: true });
      this.productionWorkTypesStore.submit({ value: payload, isValid: false });
      this.workTypesForm.markAllAsTouched();
      return;
    }
    this.productionWorkTypesStore.submit({ value: payload, isValid: true });
    this.closeWorkTypesModal();
  }

  workTypesNameErrorText(): string {
    const c = this.workTypesForm.controls.name;
    if (
      !c.invalid ||
      !(c.touched || c.dirty || this.productionWorkTypesStore.formSubmitAttempted())
    ) {
      return '';
    }
    if (c.hasError('duplicate')) return 'Такое наименование уже есть';
    if (c.hasError('required')) return 'Укажите наименование';
    if (c.hasError('minlength')) return 'Минимум 2 символа';
    return 'Проверьте наименование';
  }

  /** Сравнение наименований без учёта регистра (для дубликатов в форме и Excel). */
  private normalizeWorkTypeName(raw: string): string {
    return raw.trim().toLocaleLowerCase('ru-RU');
  }

  deleteWorkType(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.productionWorkTypesStore.delete(id);
  }

  duplicateWorkType(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.productionWorkTypesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isWorkTypesViewMode.set(false);
    this.workTypesForm.enable({ emitEvent: false });
    this.productionWorkTypesStore.startCreate();
    this.workTypesForm.reset({
      name: `${item.name} (копия)`,
      shortLabel: item.shortLabel,
      hourlyRateRub: item.hourlyRateRub,
      isActive: item.isActive,
    });
    this.isWorkTypesModalOpen.set(true);
  }

  openWorkTypesView(id: string): void {
    const item = this.productionWorkTypesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.productionWorkTypesStore.resetForm();
    this.workTypesForm.reset({
      name: item.name ?? '',
      shortLabel: item.shortLabel ?? '',
      hourlyRateRub: item.hourlyRateRub,
      isActive: item.isActive,
    });
    this.workTypesForm.disable({ emitEvent: false });
    this.isWorkTypesViewMode.set(true);
    this.isWorkTypesModalOpen.set(true);
  }

  isWorkTypesInvalid(controlName: keyof typeof this.workTypesForm.controls): boolean {
    const control = this.workTypesForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.productionWorkTypesStore.formSubmitAttempted())
    );
  }

  private buildWorkTypesPayload() {
    const rawRate = this.workTypesForm.controls.hourlyRateRub.value;
    const hourlyRateRub = typeof rawRate === 'number' ? rawRate : Number(rawRate);
    return {
      name: this.workTypesForm.controls.name.value.trim(),
      shortLabel: this.workTypesForm.controls.shortLabel.value.trim(),
      hourlyRateRub: Number.isFinite(hourlyRateRub) ? Math.round(hourlyRateRub) : 0,
      isActive: this.workTypesForm.controls.isActive.value,
    };
  }

  workTypesHourlyRateErrorText(): string {
    const c = this.workTypesForm.controls.hourlyRateRub;
    if (
      !c.invalid ||
      !(c.touched || c.dirty || this.productionWorkTypesStore.formSubmitAttempted())
    ) {
      return '';
    }
    if (c.hasError('required')) return 'Укажите ставку';
    if (c.hasError('min')) return 'Минимум 1 ₽/ч';
    return 'Проверьте ставку';
  }

  openMaterialsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    this.materialsStore.startCreate();
    this.materialsForm.reset({
      name: '',
      code: '',
      materialCharacteristicId: '',
      geometryId: '',
      unitId: '',
      purchasePriceRub: 0,
      notes: '',
      isActive: true,
    });
    this.isMaterialsModalOpen.set(true);
  }

  openMaterialsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    const item = this.materialsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.materialsStore.startEdit(item.id);
    this.materialsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      materialCharacteristicId: item.materialCharacteristicId ?? '',
      geometryId: item.geometryId ?? '',
      unitId: item.unitId ?? '',
      purchasePriceRub: item.purchasePriceRub ?? 0,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isMaterialsModalOpen.set(true);
  }

  closeMaterialsModal(): void {
    this.materialsStore.resetForm();
    this.isMaterialsViewMode.set(false);
    this.isMaterialsModalOpen.set(false);
  }

  submitMaterials(): void {
    const payload = this.buildMaterialsPayload();
    if (this.materialsForm.invalid) {
      this.materialsStore.submit({ value: payload, isValid: false });
      this.materialsForm.markAllAsTouched();
      return;
    }
    this.materialsStore.submit({ value: payload, isValid: true });
    this.closeMaterialsModal();
  }

  deleteMaterial(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.materialsStore.delete(id);
  }

  duplicateMaterial(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.materialsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    this.materialsStore.startCreate();
    this.materialsForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      code: item.code ?? '',
      materialCharacteristicId: item.materialCharacteristicId ?? '',
      geometryId: item.geometryId ?? '',
      unitId: item.unitId ?? '',
      purchasePriceRub: item.purchasePriceRub ?? 0,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isMaterialsModalOpen.set(true);
  }

  openMaterialsView(id: string): void {
    const item = this.materialsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.materialsStore.resetForm();
    this.materialsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      materialCharacteristicId: item.materialCharacteristicId ?? '',
      geometryId: item.geometryId ?? '',
      unitId: item.unitId ?? '',
      purchasePriceRub: item.purchasePriceRub ?? 0,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.materialsForm.disable({ emitEvent: false });
    this.isMaterialsViewMode.set(true);
    this.isMaterialsModalOpen.set(true);
  }

  openMaterialCharacteristicsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isMaterialCharacteristicsViewMode.set(false);
    this.materialCharacteristicsForm.enable({ emitEvent: false });
    this.materialCharacteristicsStore.startCreate();
    this.materialCharacteristicsForm.reset({
      name: '',
      code: '',
      densityKgM3: null,
      colorId: '',
      colorName: '',
      colorHex: '',
      surfaceFinishId: '',
      finishType: '',
      roughnessClass: '',
      raMicron: null,
      coatingId: '',
      coatingType: '',
      coatingSpec: '',
      coatingThicknessMicron: null,
      notes: '',
      isActive: true,
    });
    this.syncMaterialCharacteristicColorFromReference('');
    this.syncMaterialCharacteristicFinishFromReference('');
    this.syncMaterialCharacteristicCoatingFromReference('');
    this.isMaterialCharacteristicsModalOpen.set(true);
  }

  openMaterialCharacteristicsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isMaterialCharacteristicsViewMode.set(false);
    this.materialCharacteristicsForm.enable({ emitEvent: false });
    const item = this.materialCharacteristicsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.materialCharacteristicsStore.startEdit(item.id);
    this.materialCharacteristicsForm.reset(
      {
      name: item.name ?? '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorId: item.colorId ?? '',
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      surfaceFinishId: item.surfaceFinishId ?? '',
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
      coatingId: item.coatingId ?? '',
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      coatingThicknessMicron: item.coatingThicknessMicron ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
      },
      { emitEvent: false },
    );
    this.isMaterialCharacteristicsModalOpen.set(true);
  }

  closeMaterialCharacteristicsModal(): void {
    this.materialCharacteristicsStore.resetForm();
    this.isMaterialCharacteristicsViewMode.set(false);
    this.isMaterialCharacteristicsModalOpen.set(false);
  }

  submitMaterialCharacteristics(): void {
    const payload = this.buildMaterialCharacteristicsPayload();
    if (this.materialCharacteristicsForm.invalid) {
      this.materialCharacteristicsStore.submit({ value: payload, isValid: false });
      this.materialCharacteristicsForm.markAllAsTouched();
      return;
    }
    this.materialCharacteristicsStore.submit({ value: payload, isValid: true });
    this.closeMaterialCharacteristicsModal();
  }

  deleteMaterialCharacteristic(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.materialCharacteristicsStore.delete(id);
  }

  duplicateMaterialCharacteristic(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.materialCharacteristicsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isMaterialCharacteristicsViewMode.set(false);
    this.materialCharacteristicsForm.enable({ emitEvent: false });
    this.materialCharacteristicsStore.startCreate();
    this.materialCharacteristicsForm.reset(
      {
      name: item.name ? `${item.name} (копия)` : '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorId: item.colorId ?? '',
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      surfaceFinishId: item.surfaceFinishId ?? '',
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
      coatingId: item.coatingId ?? '',
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      coatingThicknessMicron: item.coatingThicknessMicron ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
      },
      { emitEvent: false },
    );
    this.isMaterialCharacteristicsModalOpen.set(true);
  }

  openMaterialCharacteristicsView(id: string): void {
    const item = this.materialCharacteristicsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.materialCharacteristicsStore.resetForm();
    this.materialCharacteristicsForm.reset(
      {
      name: item.name ?? '',
      code: item.code ?? '',
      densityKgM3: item.densityKgM3 ?? null,
      colorId: item.colorId ?? '',
      colorName: item.colorName ?? '',
      colorHex: item.colorHex ?? '',
      surfaceFinishId: item.surfaceFinishId ?? '',
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
      coatingId: item.coatingId ?? '',
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      coatingThicknessMicron: item.coatingThicknessMicron ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
      },
      { emitEvent: false },
    );
    this.materialCharacteristicsForm.disable({ emitEvent: false });
    this.isMaterialCharacteristicsViewMode.set(true);
    this.isMaterialCharacteristicsModalOpen.set(true);
  }

  openGeometriesCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isGeometriesViewMode.set(false);
    this.geometriesForm.enable({ emitEvent: false });
    this.geometriesStore.startCreate();
    this.geometriesForm.reset({
      name: '',
      shapeKey: 'rectangular',
      heightMm: null,
      lengthMm: null,
      widthMm: null,
      diameterMm: null,
      thicknessMm: null,
      notes: '',
      isActive: true,
    });
    this.isGeometriesModalOpen.set(true);
  }

  openGeometriesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isGeometriesViewMode.set(false);
    this.geometriesForm.enable({ emitEvent: false });
    const item = this.geometriesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.geometriesStore.openEdit(item.id);
    this.geometriesForm.reset({
      name: item.name ?? '',
      shapeKey: item.shapeKey ?? 'rectangular',
      heightMm: item.heightMm ?? null,
      lengthMm: item.lengthMm ?? null,
      widthMm: item.widthMm ?? null,
      diameterMm: item.diameterMm ?? null,
      thicknessMm: item.thicknessMm ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isGeometriesModalOpen.set(true);
  }

  closeGeometriesModal(): void {
    this.geometriesStore.closeDialog();
    this.isGeometriesViewMode.set(false);
    this.isGeometriesModalOpen.set(false);
  }

  submitGeometries(): void {
    const payload = this.buildGeometriesPayload();
    if (this.geometriesForm.invalid) {
      this.geometriesStore.submit({ value: payload, isValid: false });
      this.geometriesForm.markAllAsTouched();
      return;
    }
    this.geometriesStore.submit({ value: payload, isValid: true });
    this.closeGeometriesModal();
  }

  deleteGeometry(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.geometriesStore.delete(id);
    if (this.materialsForm.controls.geometryId.value === id) {
      this.materialsForm.controls.geometryId.setValue('');
    }
  }

  duplicateGeometry(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.geometriesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isGeometriesViewMode.set(false);
    this.geometriesForm.enable({ emitEvent: false });
    this.geometriesStore.startCreate();
    this.geometriesForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      shapeKey: item.shapeKey ?? 'rectangular',
      heightMm: item.heightMm ?? null,
      lengthMm: item.lengthMm ?? null,
      widthMm: item.widthMm ?? null,
      diameterMm: item.diameterMm ?? null,
      thicknessMm: item.thicknessMm ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isGeometriesModalOpen.set(true);
  }

  openGeometriesView(id: string): void {
    const item = this.geometriesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.geometriesStore.closeDialog();
    this.geometriesForm.reset({
      name: item.name ?? '',
      shapeKey: item.shapeKey ?? 'rectangular',
      heightMm: item.heightMm ?? null,
      lengthMm: item.lengthMm ?? null,
      widthMm: item.widthMm ?? null,
      diameterMm: item.diameterMm ?? null,
      thicknessMm: item.thicknessMm ?? null,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.geometriesForm.disable({ emitEvent: false });
    this.isGeometriesViewMode.set(true);
    this.isGeometriesModalOpen.set(true);
  }

  openUnitsCreate(fromMaterials = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isUnitsViewMode.set(false);
    this.unitsForm.enable({ emitEvent: false });
    this.unitsStore.startCreate();
    this.unitsForm.reset({
      name: '',
      code: '',
      notes: '',
      isActive: true,
    });
    this.unitQuickAddForMaterials.set(fromMaterials);
    this.isUnitsModalOpen.set(true);
  }

  openUnitsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isUnitsViewMode.set(false);
    this.unitsForm.enable({ emitEvent: false });
    const item = this.unitsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.unitsStore.startEdit(item.id);
    this.unitsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isUnitsModalOpen.set(true);
  }

  closeUnitsModal(): void {
    this.unitsStore.resetForm();
    this.isUnitsViewMode.set(false);
    this.unitQuickAddForMaterials.set(false);
    this.isUnitsModalOpen.set(false);
  }

  submitUnits(): void {
    const payload = this.buildUnitsPayload();
    if (this.unitsForm.invalid) {
      this.unitsStore.submit({ value: payload, isValid: false });
      this.unitsForm.markAllAsTouched();
      return;
    }
    const quickAdd = this.unitQuickAddForMaterials();
    const snapshotKey = `${payload.code.trim().toLowerCase()}|${payload.name.trim()}`;
    this.unitsStore.submit({ value: payload, isValid: true });
    if (quickAdd) {
      queueMicrotask(() => {
        const created = this.unitsStore.items().find(
          (x) =>
            `${(x.code ?? '').trim().toLowerCase()}|${x.name.trim()}` === snapshotKey
        );
        if (created) {
          this.materialsForm.controls.unitId.setValue(created.id);
        }
      });
    }
    this.closeUnitsModal();
  }

  deleteUnit(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.unitsStore.delete(id);
    if (this.materialsForm.controls.unitId.value === id) {
      this.materialsForm.controls.unitId.setValue('');
    }
  }

  duplicateUnit(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.unitsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isUnitsViewMode.set(false);
    this.unitsForm.enable({ emitEvent: false });
    this.unitsStore.startCreate();
    this.unitsForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      code: item.code ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isUnitsModalOpen.set(true);
  }

  openUnitsView(id: string): void {
    const item = this.unitsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.unitsStore.resetForm();
    this.unitsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.unitsForm.disable({ emitEvent: false });
    this.isUnitsViewMode.set(true);
    this.isUnitsModalOpen.set(true);
  }

  openRolesCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(null);
    this.rolesForm.enable({ emitEvent: false });
    this.rolesForm.reset({
      name: '',
      sortOrder: nextRoleSortOrder(this.rolesStore.items()),
      notes: '',
      isActive: true,
    });
    this.isRolesModalOpen.set(true);
  }

  openRolesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    const item = this.rolesStore.roleById(id);
    if (!item) return;
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(id);
    this.rolesForm.enable({ emitEvent: false });
    this.rolesForm.reset({
      name: item.name ?? '',
      sortOrder: item.sortOrder ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isRolesModalOpen.set(true);
  }

  openRolesView(id: string): void {
    const item = this.rolesStore.roleById(id);
    if (!item) return;
    this.rolesEditingId.set(null);
    this.rolesForm.reset({
      name: item.name ?? '',
      sortOrder: item.sortOrder ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.rolesForm.disable({ emitEvent: false });
    this.isRolesViewMode.set(true);
    this.isRolesModalOpen.set(true);
  }

  closeRolesModal(): void {
    this.rolesForm.enable({ emitEvent: false });
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(null);
    this.isRolesModalOpen.set(false);
  }

  private buildRolesPayload(): RoleItemInput {
    const v = this.rolesForm.getRawValue();
    const sortOrder = Math.round(Number(v.sortOrder));
    const editId = this.rolesEditingId();
    const fallbackSort =
      editId != null
        ? (this.rolesStore.roleById(editId)?.sortOrder ?? 1)
        : nextRoleSortOrder(this.rolesStore.items());
    const safeSort =
      Number.isFinite(sortOrder) && sortOrder >= 1 ? sortOrder : fallbackSort;
    const name = v.name.trim();
    let code: string;
    if (editId != null) {
      const prev = this.rolesStore.roleById(editId);
      const prevCode = (prev?.code ?? '').trim();
      if (prevCode) {
        code = prevCode;
      } else {
        const taken = new Set(
          this.rolesStore
            .items()
            .filter((x) => x.id !== editId)
            .map((x) => x.code.trim().toLowerCase()),
        );
        code = allocateUniqueRoleCode(slugifyRoleCodeFromName(name), taken);
      }
    } else {
      const taken = new Set(this.rolesStore.items().map((x) => x.code.trim().toLowerCase()));
      const base = slugifyRoleCodeFromName(name);
      code = allocateUniqueRoleCode(base, taken);
    }
    return {
      code,
      name,
      sortOrder: safeSort,
      notes: v.notes.trim() || undefined,
      isActive: v.isActive,
      isSystem: this.rolesEditingId()
        ? (this.rolesStore.roleById(this.rolesEditingId()!)?.isSystem ?? false)
        : false,
    };
  }

  submitRoles(): void {
    if (this.rolesForm.invalid) {
      this.rolesForm.markAllAsTouched();
      return;
    }
    const payload = this.buildRolesPayload();
    const editId = this.rolesEditingId();
    if (editId) {
      this.rolesStore.update(editId, payload);
    } else {
      this.rolesStore.create(payload);
    }
    this.closeRolesModal();
  }

  deleteRole(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    const item = this.rolesStore.roleById(id);
    if (!item || item.isSystem) return;
    this.rolesStore.remove(id);
    if (this.permissions.role() === id) {
      this.permissions.setRole(ROLE_ID_SYSTEM_ADMIN);
    }
  }

  duplicateRole(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.rolesStore.roleById(id);
    if (!item || item.isSystem) return;
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(null);
    this.rolesForm.enable({ emitEvent: false });
    this.rolesForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      sortOrder: nextRoleSortOrder(this.rolesStore.items()),
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isRolesModalOpen.set(true);
  }

  openUsersCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isUsersViewMode.set(false);
    this.usersEditingId.set(null);
    this.usersForm.enable({ emitEvent: false });
    const pw = this.usersForm.controls.password;
    pw.enable({ emitEvent: false });
    pw.setValidators([Validators.required, Validators.minLength(4)]);
    pw.updateValueAndValidity({ emitEvent: false });
    const firstRole = this.rolesStore.matrixRoleColumns()[0]?.id ?? '';
    this.usersForm.reset({
      login: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      roleId: firstRole,
    });
    this.isUsersModalOpen.set(true);
  }

  openUsersEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    const item = this.usersStore.userById(id);
    if (!item) return;
    this.isUsersViewMode.set(false);
    this.usersEditingId.set(id);
    this.usersForm.enable({ emitEvent: false });
    const pw = this.usersForm.controls.password;
    pw.enable({ emitEvent: false });
    pw.setValidators([this.usersPasswordIfAnyMin4]);
    pw.updateValueAndValidity({ emitEvent: false });
    this.usersForm.reset({
      login: item.login,
      password: '',
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      roleId: item.roleId,
    });
    this.isUsersModalOpen.set(true);
  }

  openUsersView(id: string): void {
    const item = this.usersStore.userById(id);
    if (!item) return;
    this.usersEditingId.set(null);
    this.usersForm.reset({
      login: item.login,
      password: '',
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      roleId: item.roleId,
    });
    this.usersForm.disable({ emitEvent: false });
    this.isUsersViewMode.set(true);
    this.isUsersModalOpen.set(true);
  }

  closeUsersModal(): void {
    this.usersForm.enable({ emitEvent: false });
    const pw = this.usersForm.controls.password;
    pw.enable({ emitEvent: false });
    pw.clearValidators();
    pw.updateValueAndValidity({ emitEvent: false });
    this.isUsersViewMode.set(false);
    this.usersEditingId.set(null);
    this.isUsersModalOpen.set(false);
  }

  submitUsers(): void {
    if (this.usersForm.invalid) {
      this.usersForm.markAllAsTouched();
      return;
    }
    const v = this.usersForm.getRawValue();
    const editId = this.usersEditingId();
    const logins = this.usersStore
      .items()
      .filter((x) => x.id !== editId)
      .map((x) => x.login.trim().toLowerCase());
    if (logins.includes(v.login.trim().toLowerCase())) {
      this.usersForm.controls.login.setErrors({ duplicate: true });
      this.usersForm.markAllAsTouched();
      return;
    }
    if (!this.rolesStore.roleExists(v.roleId)) {
      return;
    }
    const payload: UserItemInput = {
      login: v.login.trim(),
      password: v.password.trim(),
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      roleId: v.roleId,
    };
    if (editId) {
      this.usersStore.update(editId, payload);
    } else {
      this.usersStore.create(payload);
    }
    this.closeUsersModal();
  }

  deleteUser(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.usersStore.remove(id);
  }

  duplicateUser(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.usersStore.userById(id);
    if (!item) return;
    this.isUsersViewMode.set(false);
    this.usersEditingId.set(null);
    this.usersForm.enable({ emitEvent: false });
    const pw = this.usersForm.controls.password;
    pw.enable({ emitEvent: false });
    pw.setValidators([Validators.required, Validators.minLength(4)]);
    pw.updateValueAndValidity({ emitEvent: false });
    let login = `${item.login}_copy`;
    let n = 2;
    const existing = new Set(this.usersStore.items().map((x) => x.login.trim().toLowerCase()));
    while (existing.has(login.toLowerCase())) {
      login = `${item.login}_copy${n++}`;
    }
    this.usersForm.reset({
      login,
      password: '',
      fullName: item.fullName ? `${item.fullName} (копия)` : '',
      email: item.email,
      phone: item.phone,
      roleId: item.roleId,
    });
    this.isUsersModalOpen.set(true);
  }

  private readonly usersPasswordIfAnyMin4 = (control: AbstractControl): ValidationErrors | null => {
    const s = String(control.value ?? '').trim();
    if (!s.length) {
      return null;
    }
    return s.length >= 4 ? null : { minlength: true };
  };

  openColorsCreate(fromMaterialCharacteristics = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isColorsViewMode.set(false);
    this.colorsEditingId.set(null);
    this.colorsForm.enable({ emitEvent: false });
    this.colorsStore.startCreate();
    this.colorsForm.reset({
      ralCode: 'RAL ',
      name: '',
      hex: '#000000',
    });
    this.colorQuickAddForMaterialCharacteristics.set(fromMaterialCharacteristics);
    this.isColorsModalOpen.set(true);
  }

  openColorsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isColorsViewMode.set(false);
    this.colorsEditingId.set(id);
    this.colorsForm.enable({ emitEvent: false });
    const item = this.colorsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.colorsStore.startEdit(item.id);
    this.colorsForm.reset({
      ralCode: item.ralCode ?? '',
      name: item.name ?? '',
      hex: item.hex ?? '#000000',
    });
    this.isColorsModalOpen.set(true);
  }

  closeColorsModal(): void {
    this.colorsStore.resetForm();
    this.isColorsViewMode.set(false);
    this.colorQuickAddForMaterialCharacteristics.set(false);
    this.colorsEditingId.set(null);
    this.colorPropagationPlan.set(null);
    this.isColorPropagationConfirmOpen.set(false);
    this.isColorsModalOpen.set(false);
  }

  async submitColors(): Promise<void> {
    const payload = this.buildColorsPayload();
    if (this.colorsForm.invalid) {
      this.colorsStore.submit({ value: payload, isValid: false });
      this.colorsForm.markAllAsTouched();
      return;
    }

    const editingColorId = this.colorsEditingId();
    if (editingColorId) {
      const relatedCount = this.materialCharacteristicsStore
        .items()
        .filter((x) => x.colorId === editingColorId).length;
      if (relatedCount > 0) {
        this.colorPropagationPlan.set({
          colorId: editingColorId,
          payload,
          relatedCount,
        });
        this.isColorPropagationConfirmOpen.set(true);
        this.isColorsModalOpen.set(false);
        return;
      }
    }

    const quickAddMc = this.colorQuickAddForMaterialCharacteristics();
    const snapshotKey = `${payload.name}|${payload.hex}|${payload.ralCode ?? ''}`;
    this.colorsStore.submit({ value: payload, isValid: true });
    if (quickAddMc) {
      queueMicrotask(() => {
        const created = this.colorsStore
          .items()
          .find((x) => `${x.name}|${x.hex}|${x.ralCode ?? ''}` === snapshotKey);
        if (created) {
          this.materialCharacteristicsForm.controls.colorId.setValue(created.id);
          this.syncMaterialCharacteristicColorFromReference(created.id);
        }
      });
    }
    this.closeColorsModal();
  }

  deleteColor(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    const relatedCount = this.materialCharacteristicsStore.items().filter((x) => x.colorId === id).length;
    if (relatedCount > 0) {
      this.colorDeletePropagationPlan.set({ colorId: id, relatedCount });
      this.isColorDeletePropagationConfirmOpen.set(true);
      return;
    }
    this.colorsStore.delete(id);
    if (this.materialCharacteristicsForm.controls.colorId.value === id) {
      this.materialCharacteristicsForm.controls.colorId.setValue('');
    }
  }

  async applyColorDeletePropagationLocal(): Promise<void> {
    const plan = this.colorDeletePropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.color = 'local';
    await firstValueFrom(this.colorsRepository.remove(plan.colorId, { propagation: 'local' }));
    this.colorsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.closeColorDeletePropagationConfirm();
  }

  async applyColorDeletePropagationAll(): Promise<void> {
    const plan = this.colorDeletePropagationPlan();
    if (!plan) return;

    await firstValueFrom(this.colorsRepository.remove(plan.colorId, { propagation: 'global' }));
    this.colorsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    if (this.materialCharacteristicsForm.controls.colorId.value === plan.colorId) {
      this.materialCharacteristicsForm.controls.colorId.setValue('');
    }
    this.closeColorDeletePropagationConfirm();
  }

  closeColorDeletePropagationConfirm(): void {
    this.colorDeletePropagationPlan.set(null);
    this.isColorDeletePropagationConfirmOpen.set(false);
  }

  duplicateColor(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.colorsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isColorsViewMode.set(false);
    this.colorsEditingId.set(null);
    this.colorPropagationPlan.set(null);
    this.isColorPropagationConfirmOpen.set(false);
    this.colorsForm.enable({ emitEvent: false });
    this.colorsStore.startCreate();
    this.colorsForm.reset({
      ralCode: item.ralCode ?? 'RAL ',
      name: `${item.name} (копия)`,
      hex: item.hex,
    });
    this.isColorsModalOpen.set(true);
  }

  openColorsView(id: string): void {
    const item = this.colorsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.colorsStore.resetForm();
    this.colorsForm.reset({
      ralCode: item.ralCode ?? '',
      name: item.name ?? '',
      hex: item.hex ?? '#000000',
    });
    this.colorsForm.disable({ emitEvent: false });
    this.isColorsViewMode.set(true);
    this.isColorsModalOpen.set(true);
  }

  openSurfaceFinishesCreate(fromMaterialCharacteristics = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceFinishesEditingId.set(null);
    this.surfaceFinishesForm.enable({ emitEvent: false });
    this.surfaceFinishesStore.startCreate();
    this.surfaceFinishesForm.reset({
      finishType: '',
      roughnessClass: '',
      raMicron: null,
    });
    this.surfaceQuickAddForMaterialCharacteristics.set(fromMaterialCharacteristics);
    this.isSurfaceFinishesModalOpen.set(true);
  }

  openSurfaceFinishesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceFinishesEditingId.set(id);
    this.surfaceFinishesForm.enable({ emitEvent: false });
    const item = this.surfaceFinishesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.surfaceFinishesStore.startEdit(item.id);
    this.surfaceFinishesForm.reset({
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
    });
    this.isSurfaceFinishesModalOpen.set(true);
  }

  closeSurfaceFinishesModal(): void {
    this.surfaceFinishesStore.resetForm();
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceQuickAddForMaterialCharacteristics.set(false);
    this.surfaceFinishesEditingId.set(null);
    this.surfaceFinishPropagationPlan.set(null);
    this.isSurfaceFinishPropagationConfirmOpen.set(false);
    this.isSurfaceFinishesModalOpen.set(false);
  }

  async submitSurfaceFinishes(): Promise<void> {
    const payload = this.buildSurfaceFinishPayload();
    if (this.surfaceFinishesForm.invalid) {
      this.surfaceFinishesStore.submit({ value: payload, isValid: false });
      this.surfaceFinishesForm.markAllAsTouched();
      return;
    }

    const editingSurfaceFinishId = this.surfaceFinishesEditingId();
    if (editingSurfaceFinishId) {
      const relatedCount = this.materialCharacteristicsStore
        .items()
        .filter((x) => x.surfaceFinishId === editingSurfaceFinishId).length;
      if (relatedCount > 0) {
        this.surfaceFinishPropagationPlan.set({
          surfaceFinishId: editingSurfaceFinishId,
          payload,
          relatedCount,
        });
        this.isSurfaceFinishPropagationConfirmOpen.set(true);
        this.isSurfaceFinishesModalOpen.set(false);
        return;
      }
    }

    const quickAddMc = this.surfaceQuickAddForMaterialCharacteristics();
    const snapshotKey = `${payload.finishType}|${payload.roughnessClass}|${payload.raMicron ?? ''}`;
    this.surfaceFinishesStore.submit({ value: payload, isValid: true });
    if (quickAddMc) {
      queueMicrotask(() => {
        const created = this.surfaceFinishesStore
          .items()
          .find(
            (x) =>
              `${x.finishType}|${x.roughnessClass}|${x.raMicron ?? ''}` === snapshotKey
          );
        if (created) {
          this.materialCharacteristicsForm.controls.surfaceFinishId.setValue(created.id);
          this.syncMaterialCharacteristicFinishFromReference(created.id);
        }
      });
    }
    this.closeSurfaceFinishesModal();
  }

  deleteSurfaceFinish(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    const relatedCount = this.materialCharacteristicsStore.items().filter((x) => x.surfaceFinishId === id)
      .length;
    if (relatedCount > 0) {
      this.surfaceFinishDeletePropagationPlan.set({ surfaceFinishId: id, relatedCount });
      this.isSurfaceFinishDeletePropagationConfirmOpen.set(true);
      return;
    }
    this.surfaceFinishesStore.delete(id);
    if (this.materialCharacteristicsForm.controls.surfaceFinishId.value === id) {
      this.materialCharacteristicsForm.controls.surfaceFinishId.setValue('');
    }
  }

  async applySurfaceFinishDeletePropagationLocal(): Promise<void> {
    const plan = this.surfaceFinishDeletePropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.surfaceFinish = 'local';
    await firstValueFrom(
      this.surfaceFinishesRepository.remove(plan.surfaceFinishId, { propagation: 'local' }),
    );
    this.surfaceFinishesStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.closeSurfaceFinishDeletePropagationConfirm();
  }

  async applySurfaceFinishDeletePropagationAll(): Promise<void> {
    const plan = this.surfaceFinishDeletePropagationPlan();
    if (!plan) return;

    await firstValueFrom(
      this.surfaceFinishesRepository.remove(plan.surfaceFinishId, { propagation: 'global' }),
    );
    this.surfaceFinishesStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    if (this.materialCharacteristicsForm.controls.surfaceFinishId.value === plan.surfaceFinishId) {
      this.materialCharacteristicsForm.controls.surfaceFinishId.setValue('');
    }
    this.closeSurfaceFinishDeletePropagationConfirm();
  }

  closeSurfaceFinishDeletePropagationConfirm(): void {
    this.surfaceFinishDeletePropagationPlan.set(null);
    this.isSurfaceFinishDeletePropagationConfirmOpen.set(false);
  }

  duplicateSurfaceFinish(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.surfaceFinishesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isSurfaceFinishesViewMode.set(false);
    this.surfaceFinishesEditingId.set(null);
    this.surfaceFinishPropagationPlan.set(null);
    this.isSurfaceFinishPropagationConfirmOpen.set(false);
    this.surfaceFinishesForm.enable({ emitEvent: false });
    this.surfaceFinishesStore.startCreate();
    this.surfaceFinishesForm.reset({
      finishType: `${item.finishType} (копия)`,
      roughnessClass: item.roughnessClass,
      raMicron: item.raMicron ?? null,
    });
    this.isSurfaceFinishesModalOpen.set(true);
  }

  openSurfaceFinishesView(id: string): void {
    const item = this.surfaceFinishesStore.items().find((x) => x.id === id);
    if (!item) return;
    this.surfaceFinishesStore.resetForm();
    this.surfaceFinishesForm.reset({
      finishType: item.finishType ?? '',
      roughnessClass: item.roughnessClass ?? '',
      raMicron: item.raMicron ?? null,
    });
    this.surfaceFinishesForm.disable({ emitEvent: false });
    this.isSurfaceFinishesViewMode.set(true);
    this.isSurfaceFinishesModalOpen.set(true);
  }

  openCoatingsCreate(fromMaterialCharacteristics = false): void {
    if (!this.permissions.crud().canCreate) return;
    this.isCoatingsViewMode.set(false);
    this.coatingsEditingId.set(null);
    this.coatingsForm.enable({ emitEvent: false });
    this.coatingsStore.startCreate();
    this.coatingsForm.reset({
      coatingType: '',
      coatingSpec: '',
      thicknessMicron: null,
    });
    this.coatingQuickAddForMaterialCharacteristics.set(fromMaterialCharacteristics);
    this.isCoatingsModalOpen.set(true);
  }

  openCoatingsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isCoatingsViewMode.set(false);
    this.coatingsEditingId.set(id);
    this.coatingsForm.enable({ emitEvent: false });
    const item = this.coatingsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.coatingsStore.startEdit(item.id);
    this.coatingsForm.reset({
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      thicknessMicron: item.thicknessMicron ?? null,
    });
    this.isCoatingsModalOpen.set(true);
  }

  closeCoatingsModal(): void {
    this.coatingsStore.resetForm();
    this.isCoatingsViewMode.set(false);
    this.coatingQuickAddForMaterialCharacteristics.set(false);
    this.coatingsEditingId.set(null);
    this.coatingPropagationPlan.set(null);
    this.isCoatingPropagationConfirmOpen.set(false);
    this.isCoatingsModalOpen.set(false);
  }

  async submitCoatings(): Promise<void> {
    const payload = this.buildCoatingPayload();
    if (this.coatingsForm.invalid) {
      this.coatingsStore.submit({ value: payload, isValid: false });
      this.coatingsForm.markAllAsTouched();
      return;
    }
    const quickAddMc = this.coatingQuickAddForMaterialCharacteristics();
    const snapshotKey = `${payload.coatingType}|${payload.coatingSpec}|${payload.thicknessMicron ?? ''}`;
    const editingCoatingId = this.coatingsEditingId();
    if (editingCoatingId) {
      const relatedCount = this.materialCharacteristicsStore
        .items()
        .filter((x) => x.coatingId === editingCoatingId).length;

      if (relatedCount > 0) {
        this.coatingPropagationPlan.set({
          coatingId: editingCoatingId,
          payload,
          relatedCount,
        });
        // Варианты именно для “редактирование покрытия, которое уже используется”.
        this.isCoatingPropagationConfirmOpen.set(true);
        this.isCoatingsModalOpen.set(false);
        return;
      }

      await firstValueFrom(this.coatingsRepository.update(editingCoatingId, payload));
      this.coatingsStore.loadItems();
      this.materialCharacteristicsStore.loadItems();
      this.closeCoatingsModal();
      return;
    }

    this.coatingsStore.submit({ value: payload, isValid: true });
    if (quickAddMc) {
      queueMicrotask(() => {
        const created = this.coatingsStore.items().find(
          (x) => `${x.coatingType}|${x.coatingSpec}|${x.thicknessMicron ?? ''}` === snapshotKey,
        );
        if (created) {
          this.materialCharacteristicsForm.controls.coatingId.setValue(created.id);
          this.syncMaterialCharacteristicCoatingFromReference(created.id);
        }
      });
    }
    this.closeCoatingsModal();
  }

  async applyCoatingPropagationLocal(): Promise<void> {
    const plan = this.coatingPropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.coating = 'local';
    await firstValueFrom(this.coatingsRepository.update(plan.coatingId, plan.payload));
    this.coatingsStore.loadItems();
    this.closeCoatingsModal();
  }

  async applyCoatingPropagationAll(): Promise<void> {
    const plan = this.coatingPropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.coating = 'global';
    await firstValueFrom(
      this.coatingsRepository.update(plan.coatingId, plan.payload, { propagation: 'global' }),
    );

    this.coatingsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.closeCoatingsModal();
  }

  closeCoatingPropagationConfirm(): void {
    this.coatingPropagationPlan.set(null);
    this.isCoatingPropagationConfirmOpen.set(false);
    // Возвращаемся в режим редактирования покрытия (формы уже заполнены,
    // т.к. closeCoatingsModal() мы не вызывали).
    if (this.coatingsEditingId()) {
      this.isCoatingsModalOpen.set(true);
    }
  }

  async applyColorPropagationLocal(): Promise<void> {
    const plan = this.colorPropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.color = 'local';
    await firstValueFrom(this.colorsRepository.update(plan.colorId, plan.payload));
    this.colorsStore.loadItems();
    this.closeColorsModal();
  }

  async applyColorPropagationAll(): Promise<void> {
    const plan = this.colorPropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.color = 'global';
    await firstValueFrom(this.colorsRepository.update(plan.colorId, plan.payload, { propagation: 'global' }));

    this.colorsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.closeColorsModal();
  }

  closeColorPropagationConfirm(): void {
    this.colorPropagationPlan.set(null);
    this.isColorPropagationConfirmOpen.set(false);
    if (this.colorsEditingId()) {
      this.isColorsModalOpen.set(true);
    }
  }

  async applySurfaceFinishPropagationLocal(): Promise<void> {
    const plan = this.surfaceFinishPropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.surfaceFinish = 'local';
    await firstValueFrom(this.surfaceFinishesRepository.update(plan.surfaceFinishId, plan.payload));
    this.surfaceFinishesStore.loadItems();
    this.closeSurfaceFinishesModal();
  }

  async applySurfaceFinishPropagationAll(): Promise<void> {
    const plan = this.surfaceFinishPropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.surfaceFinish = 'global';
    await firstValueFrom(
      this.surfaceFinishesRepository.update(plan.surfaceFinishId, plan.payload, { propagation: 'global' }),
    );

    this.surfaceFinishesStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.closeSurfaceFinishesModal();
  }

  closeSurfaceFinishPropagationConfirm(): void {
    this.surfaceFinishPropagationPlan.set(null);
    this.isSurfaceFinishPropagationConfirmOpen.set(false);
    if (this.surfaceFinishesEditingId()) {
      this.isSurfaceFinishesModalOpen.set(true);
    }
  }

  deleteCoating(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    const relatedCount = this.materialCharacteristicsStore.items().filter((x) => x.coatingId === id).length;
    if (relatedCount > 0) {
      this.coatingDeletePropagationPlan.set({ coatingId: id, relatedCount });
      this.isCoatingDeletePropagationConfirmOpen.set(true);
      return;
    }
    this.coatingsStore.delete(id);
    if (this.materialCharacteristicsForm.controls.coatingId.value === id) {
      this.materialCharacteristicsForm.controls.coatingId.setValue('');
    }
  }

  async applyCoatingDeletePropagationLocal(): Promise<void> {
    const plan = this.coatingDeletePropagationPlan();
    if (!plan) return;

    this.materialsSnapshotSyncGate.coating = 'local';
    await firstValueFrom(this.coatingsRepository.remove(plan.coatingId, { propagation: 'local' }));
    this.coatingsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    this.closeCoatingDeletePropagationConfirm();
  }

  async applyCoatingDeletePropagationAll(): Promise<void> {
    const plan = this.coatingDeletePropagationPlan();
    if (!plan) return;

    await firstValueFrom(this.coatingsRepository.remove(plan.coatingId, { propagation: 'global' }));
    this.coatingsStore.loadItems();
    this.materialCharacteristicsStore.loadItems();
    if (this.materialCharacteristicsForm.controls.coatingId.value === plan.coatingId) {
      this.materialCharacteristicsForm.controls.coatingId.setValue('');
    }
    this.closeCoatingDeletePropagationConfirm();
  }

  closeCoatingDeletePropagationConfirm(): void {
    this.coatingDeletePropagationPlan.set(null);
    this.isCoatingDeletePropagationConfirmOpen.set(false);
  }

  duplicateCoating(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.coatingsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isCoatingsViewMode.set(false);
    this.coatingsEditingId.set(null);
    this.coatingPropagationPlan.set(null);
    this.isCoatingPropagationConfirmOpen.set(false);
    this.coatingsForm.enable({ emitEvent: false });
    this.coatingsStore.startCreate();
    this.coatingsForm.reset({
      coatingType: `${item.coatingType} (копия)`,
      coatingSpec: item.coatingSpec,
      thicknessMicron: item.thicknessMicron ?? null,
    });
    this.isCoatingsModalOpen.set(true);
  }

  openCoatingsView(id: string): void {
    const item = this.coatingsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.coatingsStore.resetForm();
    this.coatingsForm.reset({
      coatingType: item.coatingType ?? '',
      coatingSpec: item.coatingSpec ?? '',
      thicknessMicron: item.thicknessMicron ?? null,
    });
    this.coatingsForm.disable({ emitEvent: false });
    this.isCoatingsViewMode.set(true);
    this.isCoatingsModalOpen.set(true);
  }

  openClientsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isClientsViewMode.set(false);
    this.clientsForm.enable({ emitEvent: false });
    this.clientsStore.startCreate();
    this.clientsForm.reset({
      lastName: '',
      firstName: '',
      patronymic: '',
      address: '',
      phone: '',
      email: '',
      notes: '',
      clientMarkupPercent: null,
      passportSeries: '',
      passportNumber: '',
      passportIssuedBy: '',
      passportIssuedDate: '',
      isActive: true,
    });
    this.isClientsModalOpen.set(true);
  }

  openClientsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isClientsViewMode.set(false);
    this.clientsForm.enable({ emitEvent: false });
    const item = this.clientsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.clientsStore.startEdit(item.id);
    this.clientsForm.reset({
      lastName: item.lastName ?? '',
      firstName: item.firstName ?? '',
      patronymic: item.patronymic ?? '',
      address: item.address ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      notes: item.notes ?? '',
      clientMarkupPercent: item.clientMarkupPercent ?? null,
      passportSeries: item.passportSeries ?? '',
      passportNumber: item.passportNumber ?? '',
      passportIssuedBy: item.passportIssuedBy ?? '',
      passportIssuedDate: item.passportIssuedDate ?? '',
      isActive: item.isActive,
    });
    this.isClientsModalOpen.set(true);
  }

  closeClientsModal(): void {
    this.clientsStore.resetForm();
    this.isClientsViewMode.set(false);
    this.isClientsModalOpen.set(false);
  }

  submitClients(): void {
    const markup = this.clientsForm.controls.clientMarkupPercent.value;
    const cMarkup = this.clientsForm.controls.clientMarkupPercent;
    if (markup !== null && markup !== undefined && (markup < 0 || markup > 1000)) {
      cMarkup.setErrors({ range: true });
      this.clientsStore.submit({ value: this.buildClientPayload(), isValid: false });
      this.clientsForm.markAllAsTouched();
      return;
    }
    if (cMarkup.hasError('range')) {
      cMarkup.setErrors(null);
    }
    const payload = this.buildClientPayload();
    if (this.clientsForm.invalid) {
      this.clientsStore.submit({ value: payload, isValid: false });
      this.clientsForm.markAllAsTouched();
      return;
    }
    this.clientsStore.submit({ value: payload, isValid: true });
    this.closeClientsModal();
  }

  deleteClient(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.clientsStore.delete(id);
  }

  duplicateClient(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.clientsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isClientsViewMode.set(false);
    this.clientsForm.enable({ emitEvent: false });
    this.clientsStore.startCreate();
    this.clientsForm.reset({
      lastName: `${item.lastName} (копия)`,
      firstName: item.firstName ?? '',
      patronymic: item.patronymic ?? '',
      address: item.address ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      notes: item.notes ?? '',
      clientMarkupPercent: item.clientMarkupPercent ?? null,
      passportSeries: item.passportSeries ?? '',
      passportNumber: item.passportNumber ?? '',
      passportIssuedBy: item.passportIssuedBy ?? '',
      passportIssuedDate: item.passportIssuedDate ?? '',
      isActive: item.isActive,
    });
    this.isClientsModalOpen.set(true);
  }

  openClientsView(id: string): void {
    const item = this.clientsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.clientsStore.resetForm();
    this.clientsForm.reset({
      lastName: item.lastName ?? '',
      firstName: item.firstName ?? '',
      patronymic: item.patronymic ?? '',
      address: item.address ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      notes: item.notes ?? '',
      clientMarkupPercent: item.clientMarkupPercent ?? null,
      passportSeries: item.passportSeries ?? '',
      passportNumber: item.passportNumber ?? '',
      passportIssuedBy: item.passportIssuedBy ?? '',
      passportIssuedDate: item.passportIssuedDate ?? '',
      isActive: item.isActive,
    });
    this.clientsForm.disable({ emitEvent: false });
    this.isClientsViewMode.set(true);
    this.isClientsModalOpen.set(true);
  }

  materialCharacteristicPreviewForMaterials(): MaterialCharacteristicItem | null {
    const id = this.materialsForm.controls.materialCharacteristicId.value;
    return this.materialCharacteristicsStore.items().find((x) => x.id === id) ?? null;
  }

  materialCharacteristicCoatingSummaryForMaterials(): string {
    const ch = this.materialCharacteristicPreviewForMaterials();
    if (!ch) {
      return '—';
    }
    const line = [ch.coatingType, ch.coatingSpec].filter(Boolean).join(' · ');
    return line || '—';
  }

  materialCharacteristicDensityLabelForMaterials(): string {
    const v = this.materialCharacteristicPreviewForMaterials()?.densityKgM3;
    return v != null ? String(v) : '—';
  }

  materialCharacteristicColorTextForMaterials(): string {
    const ch = this.materialCharacteristicPreviewForMaterials();
    if (!ch) {
      return '—';
    }
    return ch.colorName?.trim() || ch.colorHex?.trim() || '—';
  }

  /** Образец цвета из выбранной характеристики материала (для превью в карточке позиции). */
  selectedMaterialProfileColorHex(): string {
    const id = this.materialsForm.controls.materialCharacteristicId.value;
    const ch = this.materialCharacteristicsStore.items().find((x) => x.id === id);
    if (!ch) {
      return '';
    }
    if (ch.colorHex?.trim()) {
      return ch.colorHex.trim();
    }
    if (ch.colorId) {
      const c = this.colorsStore.options().find((o) => o.id === ch.colorId);
      return c?.hex ?? '';
    }
    return '';
  }

  selectedMaterialCharacteristicColorHex(): string {
    const id = this.materialCharacteristicsForm.controls.colorId.value;
    const selected = this.colorsStore.options().find((x) => x.id === id);
    return (
      selected?.hex ?? this.materialCharacteristicsForm.controls.colorHex.value ?? ''
    );
  }

  colorNameWithRal(): string {
    const name = this.colorsForm.controls.name.value.trim();
    const ralCode = this.normalizeRalCode(this.colorsForm.controls.ralCode.value) ?? '';
    if (ralCode && name) {
      return `${ralCode} · ${name}`;
    }
    if (ralCode) {
      return ralCode;
    }
    return name;
  }

  /** HEX для образца в форме цвета (только валидный #RGB / #RRGGBB). */
  colorPreviewHexForColorsForm(): string | null {
    const v = this.colorsForm.controls.hex.value?.trim() ?? '';
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : null;
  }

  onRalCodeFocus(): void {
    const current = this.colorsForm.controls.ralCode.value.trim().toUpperCase();
    if (!current || current === 'RAL') {
      this.colorsForm.controls.ralCode.setValue('RAL ');
    }
  }

  onRalCodeBlur(): void {
    const raw = this.colorsForm.controls.ralCode.value;
    const upper = raw.trim().toUpperCase();
    const normalized = this.normalizeRalCode(raw);

    if (normalized) {
      this.colorsForm.controls.ralCode.setValue(normalized);
      return;
    }

    if (!upper || upper === 'RAL' || upper === 'RAL DESIGN' || upper === 'RAL DESIGN:') {
      this.colorsForm.controls.ralCode.setValue('RAL ');
      return;
    }

    if (!upper.startsWith('RAL')) {
      this.colorsForm.controls.ralCode.setValue(`RAL ${upper}`);
      return;
    }

    this.colorsForm.controls.ralCode.setValue(upper.replace(/\s+/g, ' ').trim());
  }

  /** @returns false при сбое записи файла (сообщение уже в excelImportStatus). */
  private async exportRowsToExcel(
    filename: string,
    sheetName: string,
    rows: Array<Record<string, string | number>>,
    headers: string[]
  ): Promise<boolean> {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, filename);
      return true;
    } catch {
      this.excelImportStatus.set('Не удалось сформировать Excel. Попробуйте ещё раз.');
      return false;
    }
  }

  private excelImportBegin(): void {
    this.excelImportStatus.set('Чтение и проверка файла…');
  }

  private async excelRowsFromFile(file: File): Promise<Array<Record<string, unknown>>> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }

  async exportColorsExcel(): Promise<void> {
    const rows = this.colorsStore.items().map((item) => ({
      RAL: item.ralCode ?? '',
      Название: item.name,
      HEX: item.hex,
      RGB: `${item.rgb.r},${item.rgb.g},${item.rgb.b}`,
    }));
    if (await this.exportRowsToExcel('ral-colors.xlsx', 'RAL', rows, ['RAL', 'Название', 'HEX', 'RGB'])) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadColorsTemplateExcel(): Promise<void> {
    const rows = [
      { RAL: 'RAL 7035', Название: 'Light grey', HEX: '#CBD0CC', RGB: '203,208,204' },
      { RAL: 'RAL 9005', Название: 'Jet black', HEX: '#0A0A0D', RGB: '10,10,13' },
    ];
    if (
      await this.exportRowsToExcel('ral-colors-template.xlsx', 'RAL_TEMPLATE', rows, [
        'RAL',
        'Название',
        'HEX',
        'RGB',
      ])
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async onColorsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        const parsed = this.validateAndMapColorRows(rows);
        if (!parsed.ok) {
          this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
          return;
        }
        this.colorsStore.createMany(parsed.rows);
        this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`);
      } catch {
        this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async onMaterialsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapMaterialsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.materialsStore.createMany(parsed.rows);
      this.excelImportStatus.set(`Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onMaterialCharacteristicsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapMaterialCharacteristicsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      const drafts = parsed.drafts;
      const snap = await this.getDictionaryReferenceSnapshot();
      const missingPlan = planMissingReferencesForMaterialCharacteristicsImport(drafts, snap);
      const hasMissing =
        missingPlan.colorsToCreate.length +
          missingPlan.finishesToCreate.length +
          missingPlan.coatingsToCreate.length >
        0;
      if (!hasMissing) {
        try {
          const payload = materialCharacteristicsDraftsToPayload(drafts, snap);
          this.materialCharacteristicsStore.createMany(payload);
          this.excelImportStatus.set(
            `Импортировано: ${drafts.length} строк. Данные обновлены в справочнике.`,
          );
        } catch {
          this.excelImportStatus.set('Импорт отклонен: не удалось сопоставить строки со справочниками.');
        }
        return;
      }
      this.mcImportPendingPlan = missingPlan;
      this.mcImportPendingDrafts = drafts;
      this.mcImportAssistLines.set(missingPlan.summaryLines);
      this.excelImportStatus.set(
        'В файле есть значения, которых нет в малых справочниках. Подтвердите добавление в открывшемся окне.',
      );
      this.mcImportAssistOpen.set(true);
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  cancelMcImportAssist(): void {
    this.excelImportStatus.set(
      'Импорт отменён: не найденные значения не добавлены в справочники.',
    );
    this.resetMcImportAssistUi();
  }

  confirmMcImportAssist(): void {
    const plan = this.mcImportPendingPlan;
    const drafts = [...this.mcImportPendingDrafts];
    this.resetMcImportAssistUi();
    if (!plan || !drafts.length) return;
    const creates = [
      ...plan.colorsToCreate.map((c) => this.colorsRepository.create(c)),
      ...plan.finishesToCreate.map((f) => this.surfaceFinishesRepository.create(f)),
      ...plan.coatingsToCreate.map((c) => this.coatingsRepository.create(c)),
    ];
    const done$: Observable<unknown> = creates.length ? forkJoin(creates) : of(null);
    this.sub.add(
      done$.subscribe({
        next: () => {
          this.colorsStore.loadItems();
          this.surfaceFinishesStore.loadItems();
          this.coatingsStore.loadItems();
          void this.finishMaterialCharacteristicsImportAfterRefCreates(drafts);
        },
        error: () => {
          this.excelImportStatus.set('Импорт: не удалось добавить записи в малые справочники.');
        },
      }),
    );
  }

  private resetMcImportAssistUi(): void {
    this.mcImportAssistOpen.set(false);
    this.mcImportAssistLines.set([]);
    this.mcImportPendingPlan = null;
    this.mcImportPendingDrafts = [];
  }

  private async getDictionaryReferenceSnapshot(): Promise<ReferenceSnapshot> {
    const [colors, surfaceFinishes, coatings] = await Promise.all([
      firstValueFrom(this.colorsRepository.getItems()),
      firstValueFrom(this.surfaceFinishesRepository.getItems()),
      firstValueFrom(this.coatingsRepository.getItems()),
    ]);
    return { colors, surfaceFinishes, coatings };
  }

  private async finishMaterialCharacteristicsImportAfterRefCreates(
    drafts: MaterialCharacteristicsImportDraftRow[]
  ): Promise<void> {
    try {
      const snap = await this.getDictionaryReferenceSnapshot();
      const payload = materialCharacteristicsDraftsToPayload(drafts, snap);
      this.materialCharacteristicsStore.createMany(payload);
      this.excelImportStatus.set(
        `Импортировано: ${drafts.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set(
        'Импорт: в малые справочники записи добавлены, но не удалось собрать характеристики — проверьте данные.',
      );
    }
  }

  async onGeometriesExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapGeometriesRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.geometriesStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onUnitsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapUnitsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.unitsStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onRolesExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapRolesRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.rolesStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onUsersExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapUsersRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.usersStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onWorkTypesExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapWorkTypesRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.productionWorkTypesStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onSurfaceFinishesExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapSurfaceFinishesRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.surfaceFinishesStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onCoatingsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapCoatingsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.coatingsStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async onClientsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapClientsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.clientsStore.createMany(parsed.rows);
      this.excelImportStatus.set(
        `Импортировано: ${parsed.rows.length} строк. Данные обновлены в справочнике.`,
      );
    } catch {
      this.excelImportStatus.set('Импорт отклонен: не удалось прочитать файл.');
    }
  }

  async exportMaterialsExcel(): Promise<void> {
    const headers = this.materialsExcelHeaders();
    const rows = this.materialsStore.items().map((item) => this.buildMaterialsExcelRow(item));
    if (await this.exportRowsToExcel('materials.xlsx', 'Materials', rows, headers)) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadMaterialsTemplateExcel(): Promise<void> {
    const headers = this.materialsExcelHeaders();
    const sample: Record<string, string | number> = {
      'ID материала': '',
      Название: 'Сталь 09Г2С — профиль 60×40',
      Код: 'POS-ST-6040',
      'ID характеристики': '',
      'Код характеристики': 'ST-09G2S',
      'Название характеристики': '',
      'ID геометрии': '',
      'Название геометрии': 'Профиль 60x40x2',
      'ID единицы': '',
      'Код ЕИ': 'kg',
      'Название единицы': '',
      'Цена ₽': 95,
      Заметки: '',
      Активен: 'да',
    };
    if (await this.exportRowsToExcel('materials-template.xlsx', 'Materials_TEMPLATE', [sample], headers)) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  /** Excel материалов: для каждой связи из выпадающих списков — id и подпись; плюс учётные поля. */
  private materialsExcelHeaders(): string[] {
    return [
      'ID материала',
      'Название',
      'Код',
      'ID характеристики',
      'Код характеристики',
      'Название характеристики',
      'ID геометрии',
      'Название геометрии',
      'ID единицы',
      'Код ЕИ',
      'Название единицы',
      'Цена ₽',
      'Заметки',
      'Активен',
    ];
  }

  private buildMaterialsExcelRow(item: MaterialItem): Record<string, string | number> {
    const unit = this.unitsStore.items().find((x) => x.id === item.unitId);
    const ch = this.materialCharacteristicsStore.items().find(
      (x) => x.id === item.materialCharacteristicId
    );
    const geo = this.geometriesStore.items().find((x) => x.id === item.geometryId);
    return {
      'ID материала': item.id,
      Название: item.name,
      Код: item.code ?? '',
      'ID характеристики': ch?.id ?? '',
      'Код характеристики': ch?.code ?? '',
      'Название характеристики': ch?.name ?? '',
      'ID геометрии': geo?.id ?? '',
      'Название геометрии': geo?.name ?? item.geometryName ?? '',
      'ID единицы': unit?.id ?? '',
      'Код ЕИ': unit?.code ?? '',
      'Название единицы': unit?.name ?? '',
      'Цена ₽': item.purchasePriceRub ?? '',
      Заметки: item.notes?.trim() ?? '',
      Активен: item.isActive ? 'да' : 'нет',
    };
  }

  async exportMaterialCharacteristicsExcel(): Promise<void> {
    const headers = this.materialCharacteristicsExcelHeaders();
    const rows = this.materialCharacteristicsStore
      .items()
      .map((item) => this.buildMaterialCharacteristicsExcelRow(item));
    if (
      await this.exportRowsToExcel(
        'material-characteristics.xlsx',
        'MaterialCharacteristics',
        rows,
        headers
      )
    ) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadMaterialCharacteristicsTemplateExcel(): Promise<void> {
    const headers = this.materialCharacteristicsExcelHeaders();
    const sample: Record<string, string | number> = {
      ID: '',
      Название: 'Профиль 09Г2С · RAL 7035',
      Код: 'MC-ST-7035',
      'Плотность кг/м³': 7850,
      'ID цвета': '',
      'Название цвета': '',
      'HEX цвета': '',
      'ID отделки': '',
      'Название отделки': '',
      'Тип отделки': '',
      Шероховатость: '',
      'Ra мкм': '',
      'ID покрытия': '',
      'Название покрытия': '',
      'Тип покрытия': '',
      'Спецификация покрытия': '',
      'Толщина покрытия мкм': '',
      Заметки: '',
      Активен: 'да',
    };
    if (
      await this.exportRowsToExcel(
        'material-characteristics-template.xlsx',
        'MaterialCharacteristics_TEMPLATE',
        [sample],
        headers
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  /** Excel характеристик: id строки, поля карточки, для цвета/отделки/покрытия — id и имя из справочников + сохранённые значения. */
  private materialCharacteristicsExcelHeaders(): string[] {
    return [
      'ID',
      'Название',
      'Код',
      'Плотность кг/м³',
      'ID цвета',
      'Название цвета',
      'HEX цвета',
      'ID отделки',
      'Название отделки',
      'Тип отделки',
      'Шероховатость',
      'Ra мкм',
      'ID покрытия',
      'Название покрытия',
      'Тип покрытия',
      'Спецификация покрытия',
      'Толщина покрытия мкм',
      'Заметки',
      'Активен',
    ];
  }

  private buildMaterialCharacteristicsExcelRow(
    item: MaterialCharacteristicItem
  ): Record<string, string | number> {
    const color = item.colorId
      ? this.colorsStore.items().find((c) => c.id === item.colorId)
      : undefined;
    const finish = item.surfaceFinishId
      ? this.surfaceFinishesStore.items().find((s) => s.id === item.surfaceFinishId)
      : undefined;
    const coat = item.coatingId
      ? this.coatingsStore.items().find((c) => c.id === item.coatingId)
      : undefined;

    const colorCaption = color
      ? `${color.name} ${color.ralCode ?? ''}`.trim()
      : (item.colorName ?? '').trim();
    const finishCaption = finish
      ? `${finish.finishType} / ${finish.roughnessClass}`.trim()
      : [item.finishType, item.roughnessClass].filter(Boolean).join(' / ');
    const coatCaption = coat
      ? `${coat.coatingType} / ${coat.coatingSpec}`.trim()
      : [item.coatingType, item.coatingSpec].filter(Boolean).join(' / ');

    return {
      ID: item.id,
      Название: item.name,
      Код: item.code ?? '',
      'Плотность кг/м³': item.densityKgM3 ?? '',
      'ID цвета': item.colorId ?? '',
      'Название цвета': colorCaption,
      'HEX цвета': item.colorHex?.trim() ?? '',
      'ID отделки': item.surfaceFinishId ?? '',
      'Название отделки': finishCaption,
      'Тип отделки': item.finishType?.trim() ?? '',
      Шероховатость: item.roughnessClass?.trim() ?? '',
      'Ra мкм': item.raMicron ?? '',
      'ID покрытия': item.coatingId ?? '',
      'Название покрытия': coatCaption,
      'Тип покрытия': item.coatingType?.trim() ?? '',
      'Спецификация покрытия': item.coatingSpec?.trim() ?? '',
      'Толщина покрытия мкм': item.coatingThicknessMicron ?? '',
      Заметки: item.notes?.trim() ?? '',
      Активен: item.isActive ? 'да' : 'нет',
    };
  }

  async exportGeometriesExcel(): Promise<void> {
    const rows = this.geometriesStore.geometriesData().map((x) => ({
      Название: x.name,
      Тип: x.shape,
      Параметры: x.params,
    }));
    if (await this.exportRowsToExcel('geometries.xlsx', 'Geometries', rows, ['Название', 'Тип', 'Параметры'])) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadGeometriesTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'geometries-template.xlsx',
        'Geometries_TEMPLATE',
        [{ Название: 'Круглая труба 32×2', Тип: 'tube', Параметры: '⌀32×2×6000 мм' }],
        ['Название', 'Тип', 'Параметры']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportUnitsExcel(): Promise<void> {
    const rows = this.unitsStore.unitsData().map((x) => ({
      Название: x.name,
      Код: x.code,
      Комментарий: x.notes,
    }));
    if (await this.exportRowsToExcel('units.xlsx', 'Units', rows, ['Название', 'Код', 'Комментарий'])) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadUnitsTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'units-template.xlsx',
        'Units_TEMPLATE',
        [{ Название: 'шт', Код: 'pcs', Комментарий: 'Штуки' }],
        ['Название', 'Код', 'Комментарий']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportRolesExcel(): Promise<void> {
    const rows = this.rolesStore.items().map((r) => ({
      Код: r.code,
      Порядок: r.sortOrder,
      Название: r.name,
      Заметка: r.notes ?? '',
      Активна: r.isActive ? 'Да' : 'Нет',
    }));
    if (await this.exportRowsToExcel('roles.xlsx', 'Roles', rows, ['Код', 'Порядок', 'Название', 'Заметка', 'Активна'])) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadRolesTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'roles-template.xlsx',
        'Roles_TEMPLATE',
        [
          {
            Код: '',
            Порядок: 6,
            Название: 'Менеджер продаж',
            Заметка: 'Код можно не заполнять — создастся из названия. Права — в «Админ-настройках».',
            Активна: 'Да',
          },
        ],
        ['Код', 'Порядок', 'Название', 'Заметка', 'Активна']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportUsersExcel(): Promise<void> {
    const roles = this.rolesStore.items();
    const codeOf = (roleId: string) => roles.find((r) => r.id === roleId)?.code ?? '';
    const rows = this.usersStore.items().map((u) => ({
      Логин: u.login,
      ФИО: u.fullName,
      Email: u.email,
      Телефон: u.phone,
      'Код роли': codeOf(u.roleId),
      Пароль: '***',
    }));
    if (
      await this.exportRowsToExcel('users.xlsx', 'Users', rows, [
        'Логин',
        'ФИО',
        'Email',
        'Телефон',
        'Код роли',
        'Пароль',
      ])
    ) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadUsersTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'users-template.xlsx',
        'Users_TEMPLATE',
        [
          {
            Логин: 'ivanov',
            ФИО: 'Иванов Иван',
            Email: 'ivanov@example.local',
            Телефон: '+79001234567',
            'Код роли': 'editor',
            Пароль: 'ChangeMe1',
          },
        ],
        ['Логин', 'ФИО', 'Email', 'Телефон', 'Код роли', 'Пароль']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportWorkTypesExcel(): Promise<void> {
    const rows = this.productionWorkTypesStore.items().map((x) => ({
      Наименование: x.name,
      'Короткое обозначение': x.shortLabel,
      'Ставка руб/ч': x.hourlyRateRub,
      Активна: x.isActive ? 'Да' : 'Нет',
    }));
    if (
      await this.exportRowsToExcel('production-work-types.xlsx', 'WorkTypes', rows, [
        'Наименование',
        'Короткое обозначение',
        'Ставка руб/ч',
        'Активна',
      ])
    ) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadWorkTypesTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'production-work-types-template.xlsx',
        'WorkTypes_TEMPLATE',
        [
          {
            Наименование: 'Сварка',
            'Короткое обозначение': 'Св.',
            'Ставка руб/ч': 600,
            Активна: 'Да',
          },
        ],
        ['Наименование', 'Короткое обозначение', 'Ставка руб/ч', 'Активна']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportSurfaceFinishesExcel(): Promise<void> {
    const rows = this.surfaceFinishesStore.surfaceFinishesData().map((x) => ({
      'Тип финиша': x.finishType,
      Шероховатость: x.roughnessClass,
      'Ra, мкм': x.raMicron,
    }));
    if (
      await this.exportRowsToExcel('surface-finishes.xlsx', 'SurfaceFinishes', rows, [
        'Тип финиша',
        'Шероховатость',
        'Ra, мкм',
      ])
    ) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadSurfaceFinishesTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'surface-finishes-template.xlsx',
        'SurfaceFinishes_TEMPLATE',
        [{ 'Тип финиша': 'Matte', Шероховатость: 'Ra 3.2', 'Ra, мкм': 3.2 }],
        ['Тип финиша', 'Шероховатость', 'Ra, мкм']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportCoatingsExcel(): Promise<void> {
    const rows = this.coatingsStore.coatingsData().map((x) => ({
      'Тип покрытия': x.coatingType,
      Спецификация: x.coatingSpec,
      'Толщина, мкм': x.thicknessMicron,
    }));
    if (
      await this.exportRowsToExcel('coatings.xlsx', 'Coatings', rows, [
        'Тип покрытия',
        'Спецификация',
        'Толщина, мкм',
      ])
    ) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadCoatingsTemplateExcel(): Promise<void> {
    if (
      await this.exportRowsToExcel(
        'coatings-template.xlsx',
        'Coatings_TEMPLATE',
        [{ 'Тип покрытия': 'Anodizing', Спецификация: 'Clear anodized', 'Толщина, мкм': 20 }],
        ['Тип покрытия', 'Спецификация', 'Толщина, мкм']
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  async exportClientsExcel(): Promise<void> {
    const headers = [
      'Фамилия',
      'Имя',
      'Отчество',
      'Адрес',
      'Телефон',
      'Email',
      'Наценка %',
      'Активен',
      'Заметки',
      'Паспорт серия',
      'Паспорт номер',
      'Кем выдан',
      'Дата выдачи',
    ];
    const rows = this.clientsStore.items().map((item) => ({
      Фамилия: item.lastName,
      Имя: item.firstName,
      Отчество: item.patronymic,
      Адрес: item.address,
      Телефон: item.phone,
      Email: item.email,
      'Наценка %': item.clientMarkupPercent ?? '',
      Активен: item.isActive ? 'да' : 'нет',
      Заметки: item.notes,
      'Паспорт серия': item.passportSeries,
      'Паспорт номер': item.passportNumber,
      'Кем выдан': item.passportIssuedBy,
      'Дата выдачи': item.passportIssuedDate,
    }));
    if (await this.exportRowsToExcel('clients.xlsx', 'Clients', rows, headers)) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadClientsTemplateExcel(): Promise<void> {
    const headers = [
      'Фамилия',
      'Имя',
      'Отчество',
      'Адрес',
      'Телефон',
      'Email',
      'Наценка %',
      'Активен',
      'Заметки',
      'Паспорт серия',
      'Паспорт номер',
      'Кем выдан',
      'Дата выдачи',
    ];
    if (
      await this.exportRowsToExcel(
        'clients-template.xlsx',
        'Clients_TEMPLATE',
        [
          {
            Фамилия: 'Иванов',
            Имя: 'Пётр',
            Отчество: 'Сергеевич',
            Адрес: 'Москва, ул. Примерная, д. 1',
            Телефон: '+7 900 000-00-00',
            Email: 'contact@example.test',
            'Наценка %': 10,
            Активен: 'да',
            Заметки: 'Предоплата 30%',
            'Паспорт серия': '',
            'Паспорт номер': '',
            'Кем выдан': '',
            'Дата выдачи': '',
          },
        ],
        headers
      )
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  private syncMaterialCharacteristicColorFromReference(colorId: string): void {
    const selected = this.colorsStore.options().find((x) => x.id === colorId);
    if (!selected) {
      if (!colorId) {
        this.materialCharacteristicsForm.patchValue(
          { colorName: '', colorHex: '' },
          { emitEvent: false }
        );
      }
      return;
    }
    this.materialCharacteristicsForm.patchValue(
      {
        colorName: selected.label,
        colorHex: selected.hex,
      },
      { emitEvent: false }
    );
  }

  private syncMaterialCharacteristicFinishFromReference(surfaceFinishId: string): void {
    const selected = this.surfaceFinishesStore.options().find((x) => x.id === surfaceFinishId);
    if (!selected) {
      if (!surfaceFinishId) {
        this.materialCharacteristicsForm.patchValue(
          { finishType: '', roughnessClass: '', raMicron: null },
          { emitEvent: false }
        );
      }
      return;
    }
    this.materialCharacteristicsForm.patchValue(
      {
        finishType: selected.finishType,
        roughnessClass: selected.roughnessClass,
        raMicron: selected.raMicron ?? null,
      },
      { emitEvent: false }
    );
  }

  private syncMaterialCharacteristicCoatingFromReference(coatingId: string): void {
    const selected = this.coatingsStore.options().find((x) => x.id === coatingId);
    if (!selected) {
      if (!coatingId) {
        this.materialCharacteristicsForm.patchValue(
          { coatingType: '', coatingSpec: '', coatingThicknessMicron: null },
          { emitEvent: false }
        );
      }
      return;
    }
    this.materialCharacteristicsForm.patchValue(
      {
        coatingType: selected.coatingType,
        coatingSpec: selected.coatingSpec,
        coatingThicknessMicron: selected.thicknessMicron ?? null,
      },
      { emitEvent: false }
    );
  }

  isMaterialsInvalid(controlName: keyof typeof this.materialsForm.controls): boolean {
    const control = this.materialsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.materialsStore.formSubmitAttempted())
    );
  }

  isMaterialCharacteristicsInvalid(
    controlName: keyof typeof this.materialCharacteristicsForm.controls
  ): boolean {
    const control = this.materialCharacteristicsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched ||
        control.dirty ||
        this.materialCharacteristicsStore.formSubmitAttempted())
    );
  }

  isGeometriesInvalid(controlName: keyof typeof this.geometriesForm.controls): boolean {
    const control = this.geometriesForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.geometriesStore.formSubmitAttempted())
    );
  }

  geometriesDimensionVisible(field: GeometryDimKey): boolean {
    return isGeometryDimensionVisible(this.geometriesForm.controls.shapeKey.value, field);
  }

  isUnitsInvalid(controlName: keyof typeof this.unitsForm.controls): boolean {
    const control = this.unitsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.unitsStore.formSubmitAttempted())
    );
  }

  isColorsInvalid(controlName: keyof typeof this.colorsForm.controls): boolean {
    const control = this.colorsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.colorsStore.formSubmitAttempted())
    );
  }

  isColorsInvalidOnBlur(controlName: keyof typeof this.colorsForm.controls): boolean {
    const control = this.colorsForm.controls[controlName];
    return control.invalid && (control.touched || this.colorsStore.formSubmitAttempted());
  }

  isSurfaceFinishesInvalid(
    controlName: keyof typeof this.surfaceFinishesForm.controls
  ): boolean {
    const control = this.surfaceFinishesForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.surfaceFinishesStore.formSubmitAttempted())
    );
  }

  isCoatingsInvalid(controlName: keyof typeof this.coatingsForm.controls): boolean {
    const control = this.coatingsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.coatingsStore.formSubmitAttempted())
    );
  }

  isClientsInvalid(controlName: keyof typeof this.clientsForm.controls): boolean {
    const control = this.clientsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.clientsStore.formSubmitAttempted())
    );
  }

  materialsPurchasePriceErrorText(): string {
    const c = this.materialsForm.controls.purchasePriceRub;
    if (
      !c.invalid ||
      !(c.touched || c.dirty || this.materialsStore.formSubmitAttempted())
    ) {
      return '';
    }
    if (c.hasError('required')) return 'Укажите цену';
    if (c.hasError('min')) return 'Минимум 1 ₽ за единицу';
    return 'Проверьте цену';
  }

  private buildMaterialsPayload(): MaterialItemInput {
    const uid = this.materialsForm.controls.unitId.value;
    const u = this.unitsStore.items().find((x) => x.id === uid);
    const gid = this.materialsForm.controls.geometryId.value;
    const g = this.geometriesStore.items().find((x) => x.id === gid);
    const rawP = this.materialsForm.controls.purchasePriceRub.value;
    const purchasePriceRub = typeof rawP === 'number' ? rawP : Number(rawP);
    return {
      name: this.materialsForm.controls.name.value.trim(),
      code: this.materialsForm.controls.code.value.trim() || undefined,
      materialCharacteristicId: this.materialsForm.controls.materialCharacteristicId.value,
      geometryId: gid,
      geometryName: g?.name,
      unitId: uid || undefined,
      unitName: u ? `${u.name} (${u.code ?? '—'})` : undefined,
      purchasePriceRub: Number.isFinite(purchasePriceRub) ? Math.round(purchasePriceRub) : 0,
      notes: this.materialsForm.controls.notes.value.trim() || undefined,
      isActive: this.materialsForm.controls.isActive.value,
    };
  }

  private buildMaterialCharacteristicsPayload(): MaterialCharacteristicItemInput {
    return {
      name: this.materialCharacteristicsForm.controls.name.value.trim(),
      code: this.materialCharacteristicsForm.controls.code.value.trim() || undefined,
      densityKgM3: this.materialCharacteristicsForm.controls.densityKgM3.value ?? undefined,
      colorId: this.materialCharacteristicsForm.controls.colorId.value || undefined,
      colorName: this.materialCharacteristicsForm.controls.colorName.value.trim() || undefined,
      colorHex: this.materialCharacteristicsForm.controls.colorHex.value.trim() || undefined,
      surfaceFinishId:
        this.materialCharacteristicsForm.controls.surfaceFinishId.value || undefined,
      finishType: this.materialCharacteristicsForm.controls.finishType.value.trim() || undefined,
      roughnessClass:
        this.materialCharacteristicsForm.controls.roughnessClass.value.trim() || undefined,
      raMicron: this.materialCharacteristicsForm.controls.raMicron.value ?? undefined,
      coatingId: this.materialCharacteristicsForm.controls.coatingId.value || undefined,
      coatingType: this.materialCharacteristicsForm.controls.coatingType.value.trim() || undefined,
      coatingSpec: this.materialCharacteristicsForm.controls.coatingSpec.value.trim() || undefined,
      coatingThicknessMicron:
        this.materialCharacteristicsForm.controls.coatingThicknessMicron.value ?? undefined,
      notes: this.materialCharacteristicsForm.controls.notes.value.trim() || undefined,
      isActive: this.materialCharacteristicsForm.controls.isActive.value,
    };
  }

  private buildGeometriesPayload() {
    return {
      name: this.geometriesForm.controls.name.value.trim(),
      shapeKey: this.geometriesForm.controls.shapeKey.value,
      heightMm: this.geometriesForm.controls.heightMm.value ?? undefined,
      lengthMm: this.geometriesForm.controls.lengthMm.value ?? undefined,
      widthMm: this.geometriesForm.controls.widthMm.value ?? undefined,
      diameterMm: this.geometriesForm.controls.diameterMm.value ?? undefined,
      thicknessMm: this.geometriesForm.controls.thicknessMm.value ?? undefined,
      notes: this.geometriesForm.controls.notes.value.trim() || undefined,
      isActive: this.geometriesForm.controls.isActive.value,
    };
  }

  private buildUnitsPayload() {
    return {
      name: this.unitsForm.controls.name.value.trim(),
      code: this.unitsForm.controls.code.value.trim(),
      notes: this.unitsForm.controls.notes.value.trim() || undefined,
      isActive: this.unitsForm.controls.isActive.value,
    };
  }

  private buildColorsPayload() {
    const value = this.colorsForm.getRawValue();
    const normalizedHex = /^#([A-Fa-f0-9]{6})$/.test(value.hex)
      ? value.hex.toUpperCase()
      : '#000000';
    const normalizedRalCode = this.normalizeRalCode(value.ralCode);
    return {
      ralCode: normalizedRalCode,
      name: value.name.trim(),
      hex: normalizedHex,
      rgb: {
        r: Number.parseInt(normalizedHex.slice(1, 3), 16),
        g: Number.parseInt(normalizedHex.slice(3, 5), 16),
        b: Number.parseInt(normalizedHex.slice(5, 7), 16),
      },
    };
  }

  private buildSurfaceFinishPayload() {
    return {
      finishType: this.surfaceFinishesForm.controls.finishType.value.trim(),
      roughnessClass: this.surfaceFinishesForm.controls.roughnessClass.value.trim(),
      raMicron: this.surfaceFinishesForm.controls.raMicron.value ?? undefined,
    };
  }

  private buildCoatingPayload() {
    return {
      coatingType: this.coatingsForm.controls.coatingType.value.trim(),
      coatingSpec: this.coatingsForm.controls.coatingSpec.value.trim(),
      thicknessMicron: this.coatingsForm.controls.thicknessMicron.value ?? undefined,
    };
  }

  private buildClientPayload(): ClientItemInput {
    const raw = this.clientsForm.controls.clientMarkupPercent.value;
    let clientMarkupPercent: number | null = null;
    if (raw !== null && raw !== undefined && !Number.isNaN(Number(raw))) {
      clientMarkupPercent = Math.round(Number(raw));
    }
    return {
      lastName: this.clientsForm.controls.lastName.value.trim(),
      firstName: this.clientsForm.controls.firstName.value.trim(),
      patronymic: this.clientsForm.controls.patronymic.value.trim(),
      address: this.clientsForm.controls.address.value.trim(),
      phone: this.clientsForm.controls.phone.value.trim(),
      email: this.clientsForm.controls.email.value.trim(),
      notes: this.clientsForm.controls.notes.value.trim(),
      clientMarkupPercent,
      passportSeries: this.clientsForm.controls.passportSeries.value.trim(),
      passportNumber: this.clientsForm.controls.passportNumber.value.trim(),
      passportIssuedBy: this.clientsForm.controls.passportIssuedBy.value.trim(),
      passportIssuedDate: this.clientsForm.controls.passportIssuedDate.value.trim(),
      isActive: this.clientsForm.controls.isActive.value,
    };
  }

  private validateAndMapColorRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ ralCode?: string; name: string; hex: string; rgb: { r: number; g: number; b: number } }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ ralCode?: string; name: string; hex: string; rgb: { r: number; g: number; b: number } }> =
      [];
    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['RAL', 'Название', 'HEX', 'RGB'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return {
        ok: false,
        rows: mapped,
        errors: [`Нет колонок: ${missingHeaders.join(', ')}`],
      };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const ralRaw = String(row['RAL'] ?? '');
      const ralCode = this.normalizeRalCode(ralRaw);
      const name = String(row['Название'] ?? '').trim();
      const hex = String(row['HEX'] ?? '').trim().toUpperCase();
      const rgbRaw = String(row['RGB'] ?? '').trim();
      if (!name || !hex || !rgbRaw) {
        errors.push(`Строка ${rowNo}: заполните Название/HEX/RGB.`);
        return;
      }
      if (ralRaw.trim() && !ralCode) {
        errors.push(`Строка ${rowNo}: RAL должен быть в формате RAL 0000 или 0000.`);
        return;
      }
      if (!/^#([A-F0-9]{6})$/.test(hex)) {
        errors.push(`Строка ${rowNo}: HEX должен быть #RRGGBB.`);
        return;
      }
      const rgbParts = rgbRaw
        .split(/[,\s;]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (rgbParts.length !== 3 || rgbParts.some((x) => !/^\d+$/.test(x))) {
        errors.push(`Строка ${rowNo}: RGB должен быть в формате R,G,B.`);
        return;
      }
      const [r, g, b] = rgbParts.map((x) => Number.parseInt(x, 10));
      if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) {
        errors.push(`Строка ${rowNo}: RGB вне диапазона 0..255.`);
        return;
      }
      const check = {
        r: Number.parseInt(hex.slice(1, 3), 16),
        g: Number.parseInt(hex.slice(3, 5), 16),
        b: Number.parseInt(hex.slice(5, 7), 16),
      };
      if (check.r !== r || check.g !== g || check.b !== b) {
        errors.push(`Строка ${rowNo}: RGB не соответствует HEX.`);
        return;
      }
      mapped.push({ ralCode, name, hex, rgb: { r, g, b } });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private parseNumberOrNull(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const s = String(raw).trim();
    if (!s) return null;
    const normalized = s.replace(/\s+/g, '').replace(',', '.');
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeRalCode(raw: string): string | undefined {
    const value = raw.trim().toUpperCase();
    if (!value) return undefined;

    if (value === 'RAL' || value === 'RAL DESIGN' || value === 'RAL DESIGN:') {
      return undefined;
    }

    const classic = /^(?:RAL\s*)?(\d{4})$/.exec(value);
    if (classic) {
      return `RAL ${classic[1]}`;
    }

    const design = /^(?:RAL\s*DESIGN[:\s]*)?(\d{3})\s*(\d{2})\s*(\d{2})$/.exec(value);
    if (design) {
      return `RAL DESIGN ${design[1]} ${design[2]} ${design[3]}`;
    }

    return undefined;
  }

  private ralCodeValidator(control: AbstractControl<string>): ValidationErrors | null {
    const value = (control.value ?? '').trim().toUpperCase();
    if (!value || value === 'RAL' || value === 'RAL DESIGN' || value === 'RAL DESIGN:') {
      return null;
    }

    const classicOk = /^(?:RAL\s*)?\d{4}$/.test(value);
    const designOk = /^(?:RAL\s*DESIGN[:\s]*)?\d{3}\s*\d{2}\s*\d{2}$/.test(value);
    return classicOk || designOk ? null : { ralCodeFormat: true };
  }

  private resolveMaterialUnitIdByCode(raw: string): { id: string; label: string } | null {
    const key = raw.trim().toLowerCase();
    if (!key) return null;
    const u = this.unitsStore.items().find((x) => (x.code ?? '').trim().toLowerCase() === key);
    return u ? { id: u.id, label: `${u.name} (${u.code})` } : null;
  }

  private validateAndMapMaterialsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: MaterialItemInput[];
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: MaterialItemInput[] = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const firstKeys = Object.keys(rows[0] ?? {});
    if (!firstKeys.includes('Название') || !firstKeys.includes('Цена ₽')) {
      return {
        ok: false,
        rows: mapped,
        errors: ['Нужны колонки «Название» и «Цена ₽».'],
      };
    }

    const mcByCode = new Map(
      this.materialCharacteristicsStore
        .items()
        .map((x) => [(x.code ?? '').trim().toLowerCase(), x] as const)
    );
    const mcById = new Map(this.materialCharacteristicsStore.items().map((x) => [x.id, x] as const));

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const code = String(row['Код'] ?? '').trim();
      const mcId = String(row['ID характеристики'] ?? '').trim();
      const mcCode = String(row['Код характеристики'] ?? '').trim();
      const geoId = String(row['ID геометрии'] ?? '').trim();
      const geometryName = String(row['Название геометрии'] ?? '').trim();
      const unitId = String(row['ID единицы'] ?? '').trim();
      const unitCode = String(row['Код ЕИ'] ?? '').trim();
      const priceRaw = this.parseNumberOrNull(row['Цена ₽']);
      const notes = String(row['Заметки'] ?? '').trim();
      const activeRaw = String(row['Активен'] ?? '')
        .trim()
        .toLowerCase();

      if (!name) {
        errors.push(`Строка ${rowNo}: укажите название позиции.`);
        return;
      }

      let ch = mcId ? mcById.get(mcId) : undefined;
      if (!ch && mcCode) {
        ch = mcByCode.get(mcCode.toLowerCase());
      }
      if (!ch || !ch.isActive) {
        errors.push(
          `Строка ${rowNo}: укажите «ID характеристики» или «Код характеристики» активной записи справочника характеристик.`,
        );
        return;
      }

      let geo = geoId
        ? this.geometriesStore.items().find((g) => g.id === geoId && g.isActive)
        : undefined;
      if (!geo && geometryName) {
        geo = this.geometriesStore
          .items()
          .find((g) => g.isActive && g.name.trim().toLowerCase() === geometryName.toLowerCase());
      }
      if (!geo) {
        errors.push(
          `Строка ${rowNo}: укажите «ID геометрии» или «Название геометрии» (как у активной записи «Форма и габариты»).`,
        );
        return;
      }

      let unitRef: { id: string; label: string } | null = null;
      if (unitId) {
        const u = this.unitsStore.items().find((x) => x.id === unitId);
        unitRef = u ? { id: u.id, label: `${u.name} (${u.code})` } : null;
      } else if (unitCode) {
        unitRef = this.resolveMaterialUnitIdByCode(unitCode);
      }
      if (!unitRef) {
        errors.push(`Строка ${rowNo}: укажите «ID единицы» или «Код ЕИ» из справочника единиц.`);
        return;
      }

      if (priceRaw === null || Math.round(priceRaw) < 1) {
        errors.push(`Строка ${rowNo}: «Цена ₽» — целое число не меньше 1.`);
        return;
      }

      let isActiveRow = true;
      if (activeRaw && ['нет', 'no', 'false', '0'].includes(activeRaw)) {
        isActiveRow = false;
      } else if (activeRaw && !['да', 'yes', 'true', '1', ''].includes(activeRaw)) {
        errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
        return;
      }

      mapped.push({
        name,
        code: code || undefined,
        materialCharacteristicId: ch.id,
        geometryId: geo.id,
        geometryName: geo.name,
        unitId: unitRef.id,
        unitName: unitRef.label,
        purchasePriceRub: Math.round(priceRaw),
        notes: notes || undefined,
        isActive: isActiveRow,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapMaterialCharacteristicsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    drafts: MaterialCharacteristicsImportDraftRow[];
    errors: string[];
  } {
    const errors: string[] = [];
    const drafts: MaterialCharacteristicsImportDraftRow[] = [];

    if (!rows.length) return { ok: false, drafts, errors: ['Пустой файл.'] };

    const firstKeys = Object.keys(rows[0] ?? {});
    const legacyFormat = firstKeys.includes('Цвет') && !firstKeys.includes('ID цвета');
    const newFormat = firstKeys.includes('ID цвета');

    const snap: ReferenceSnapshot = {
      colors: this.colorsStore.items(),
      surfaceFinishes: this.surfaceFinishesStore.items(),
      coatings: this.coatingsStore.items(),
    };

    if (legacyFormat) {
      const requiredHeaders = [
        'Название',
        'Код',
        'Плотность',
        'Цвет',
        'Финиш',
        'Покрытие',
        'Заметки',
        'Активен',
      ];
      const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
      if (missingHeaders.length) {
        return {
          ok: false,
          drafts,
          errors: [`Нет колонок: ${missingHeaders.join(', ')}`],
        };
      }

      rows.forEach((row, idx) => {
        const rowNo = idx + 2;
        const name = String(row['Название'] ?? '').trim();
        const code = String(row['Код'] ?? '').trim();
        const densityRaw = row['Плотность'];
        const colorRaw = String(row['Цвет'] ?? '').trim();
        const finishRaw = String(row['Финиш'] ?? '').trim();
        const coatingCell = String(row['Покрытие'] ?? '').trim();
        const notes = String(row['Заметки'] ?? '').trim();
        const activeRaw = String(row['Активен'] ?? '')
          .trim()
          .toLowerCase();

        if (!name || !colorRaw || !finishRaw || !coatingCell) {
          errors.push(`Строка ${rowNo}: заполните Название/Цвет/Финиш/Покрытие.`);
          return;
        }

        let densityKgM3: number | undefined;
        if (densityRaw !== '' && densityRaw !== null && densityRaw !== undefined) {
          const d = this.parseNumberOrNull(densityRaw);
          if (d === null || d < 0) {
            errors.push(`Строка ${rowNo}: Плотность должна быть числом >= 0 или пусто.`);
            return;
          }
          densityKgM3 = d;
        }

        let isActiveRow = true;
        if (!activeRaw) {
          isActiveRow = true;
        } else if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
          isActiveRow = true;
        } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
          isActiveRow = false;
        } else {
          errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
          return;
        }

        drafts.push({
          name,
          code: code || undefined,
          densityKgM3,
          colorRaw,
          finishRaw,
          coatingCell,
          notes: notes || undefined,
          isActive: isActiveRow,
        });
      });
    } else if (newFormat) {
      if (!firstKeys.includes('Название')) {
        return { ok: false, drafts, errors: ['Нужна колонка «Название».'] };
      }

      rows.forEach((row, idx) => {
        const rowNo = idx + 2;
        const name = String(row['Название'] ?? '').trim();
        if (!name) {
          errors.push(`Строка ${rowNo}: укажите название.`);
          return;
        }
        const code = String(row['Код'] ?? '').trim();
        const densityRaw = row['Плотность кг/м³'];
        const notes = String(row['Заметки'] ?? '').trim();
        const activeRaw = String(row['Активен'] ?? '')
          .trim()
          .toLowerCase();

        let densityKgM3: number | undefined;
        if (densityRaw !== '' && densityRaw !== null && densityRaw !== undefined) {
          const d = this.parseNumberOrNull(densityRaw);
          if (d === null || d < 0) {
            errors.push(`Строка ${rowNo}: Плотность должна быть числом >= 0 или пусто.`);
            return;
          }
          densityKgM3 = d;
        }

        let isActiveRow = true;
        if (!activeRaw) {
          isActiveRow = true;
        } else if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
          isActiveRow = true;
        } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
          isActiveRow = false;
        } else {
          errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
          return;
        }

        const colorRaw = this.resolveMcImportColorRaw(row, snap, rowNo, errors);
        const finishRaw = this.resolveMcImportFinishRaw(row, snap, rowNo, errors);
        const coatingCell = this.resolveMcImportCoatingCell(row, snap, rowNo, errors);
        if (colorRaw === null || finishRaw === null || coatingCell === null) {
          return;
        }

        drafts.push({
          name,
          code: code || undefined,
          densityKgM3,
          colorRaw,
          finishRaw,
          coatingCell,
          notes: notes || undefined,
          isActive: isActiveRow,
        });
      });
    } else {
      return {
        ok: false,
        drafts,
        errors: [
          'Неизвестный формат файла: для старого шаблона нужны колонки «Цвет», «Финиш», «Покрытие»; для нового скачайте шаблон с хаба (колонки «ID цвета», …).',
        ],
      };
    }

    if (errors.length) return { ok: false, drafts, errors: errors.slice(0, 6) };
    return { ok: true, drafts, errors: [] };
  }

  /** Строка для сопоставления цвета: по ID из файла или текст «Название цвета». */
  private resolveMcImportColorRaw(
    row: Record<string, unknown>,
    snap: ReferenceSnapshot,
    rowNo: number,
    errors: string[]
  ): string | null {
    const id = String(row['ID цвета'] ?? '').trim();
    if (id) {
      const c = snap.colors.find((x) => x.id === id);
      if (!c) {
        errors.push(`Строка ${rowNo}: неизвестный «ID цвета».`);
        return null;
      }
      return `${c.name} ${c.ralCode ?? ''}`.trim();
    }
    return String(row['Название цвета'] ?? '').trim();
  }

  private resolveMcImportFinishRaw(
    row: Record<string, unknown>,
    snap: ReferenceSnapshot,
    rowNo: number,
    errors: string[]
  ): string | null {
    const id = String(row['ID отделки'] ?? '').trim();
    if (id) {
      const f = snap.surfaceFinishes.find((x) => x.id === id);
      if (!f) {
        errors.push(`Строка ${rowNo}: неизвестный «ID отделки».`);
        return null;
      }
      return `${f.finishType} / ${f.roughnessClass}`.trim();
    }
    return String(row['Название отделки'] ?? '').trim();
  }

  private resolveMcImportCoatingCell(
    row: Record<string, unknown>,
    snap: ReferenceSnapshot,
    rowNo: number,
    errors: string[]
  ): string | null {
    const id = String(row['ID покрытия'] ?? '').trim();
    if (id) {
      const c = snap.coatings.find((x) => x.id === id);
      if (!c) {
        errors.push(`Строка ${rowNo}: неизвестный «ID покрытия».`);
        return null;
      }
      return `${c.coatingType} · ${c.coatingSpec}`.trim();
    }
    const t = String(row['Тип покрытия'] ?? '').trim();
    const s = String(row['Спецификация покрытия'] ?? '').trim();
    if (t && s) return `${t} · ${s}`;
    if (t) return t;
    return String(row['Название покрытия'] ?? '').trim();
  }

  /**
   * Компактный формат (как в UI/экспорте): 20×20×3×6000 мм, ⌀32×2×6000 мм, разделители × x X х.
   */
  private tryParseCompactGeometryParams(
    raw: string,
    shapeKey: string
  ): {
    heightMm: number | null;
    lengthMm: number | null;
    widthMm: number | null;
    diameterMm: number | null;
    thicknessMm: number | null;
  } | null {
    let s = raw.trim();
    s = s.replace(/\s*мм\s*$/i, '').replace(/\s*mm\s*$/i, '').trim();
    if (!s) return null;

    const parts = s.split(/[×xXх\u00D7]/u).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;

    const nums: number[] = [];
    for (const p of parts) {
      const cleaned = p
        .replace(/^[⌀Ø]\s*/u, '')
        .replace(/^диам\.?\s*/i, '');
      const v = this.parseNumberOrNull(cleaned);
      if (v === null) return null;
      nums.push(v);
    }

    const n = nums;
    switch (shapeKey) {
      case 'rectangular':
        if (n.length === 4) {
          return {
            heightMm: n[0],
            widthMm: n[1],
            thicknessMm: n[2],
            lengthMm: n[3],
            diameterMm: null,
          };
        }
        if (n.length === 3) {
          return {
            heightMm: n[0],
            widthMm: n[1],
            thicknessMm: null,
            lengthMm: n[2],
            diameterMm: null,
          };
        }
        return null;
      case 'tube':
        if (n.length === 3) {
          return {
            diameterMm: n[0],
            thicknessMm: n[1],
            lengthMm: n[2],
            heightMm: null,
            widthMm: null,
          };
        }
        return null;
      case 'cylindrical':
        if (n.length === 2) {
          return {
            diameterMm: n[0],
            lengthMm: n[1],
            heightMm: null,
            widthMm: null,
            thicknessMm: null,
          };
        }
        return null;
      case 'plate':
        if (n.length === 3) {
          return {
            lengthMm: n[0],
            widthMm: n[1],
            thicknessMm: n[2],
            heightMm: null,
            diameterMm: null,
          };
        }
        return null;
      default:
        if (n.length === 0 || n.length > 5) return null;
        return {
          heightMm: n[0] ?? null,
          widthMm: n[1] ?? null,
          lengthMm: n[2] ?? null,
          diameterMm: n[3] ?? null,
          thicknessMm: n[4] ?? null,
        };
    }
  }

  private validateAndMapGeometriesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{
      name: string;
      shapeKey: string;
      heightMm?: number;
      lengthMm?: number;
      widthMm?: number;
      diameterMm?: number;
      thicknessMm?: number;
      notes?: string;
      isActive: boolean;
    }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{
      name: string;
      shapeKey: string;
      heightMm?: number;
      lengthMm?: number;
      widthMm?: number;
      diameterMm?: number;
      thicknessMm?: number;
      notes?: string;
      isActive: boolean;
    }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Название', 'Тип', 'Параметры'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    const allowedShapes = new Set(['rectangular', 'cylindrical', 'tube', 'plate', 'custom']);

    const extractNumber = (source: string, pattern: RegExp): number | null => {
      const match = pattern.exec(source);
      if (!match) return null;
      return this.parseNumberOrNull(match[1]);
    };

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const shapeKey = String(row['Тип'] ?? '').trim().toLowerCase();
      const paramsRaw = String(row['Параметры'] ?? '').trim();

      if (!name || !paramsRaw) {
        errors.push(`Строка ${rowNo}: заполните Название и Параметры.`);
        return;
      }
      if (!allowedShapes.has(shapeKey)) {
        errors.push(`Строка ${rowNo}: Тип должен быть одним из: ${Array.from(allowedShapes).join(', ')}.`);
        return;
      }

      const params = paramsRaw;
      let heightMm = extractNumber(params, /В\s*([0-9.,-]+)/i);
      let lengthMm = extractNumber(params, /Дл\s*([0-9.,-]+)/i);
      let widthMm = extractNumber(params, /Ш\s*([0-9.,-]+)/i);
      let diameterMm = extractNumber(params, /Диам\s*([0-9.,-]+)/i);
      let thicknessMm = extractNumber(params, /Толщ\s*([0-9.,-]+)/i);

      const legacyAny =
        heightMm !== null ||
        lengthMm !== null ||
        widthMm !== null ||
        diameterMm !== null ||
        thicknessMm !== null;

      if (!legacyAny) {
        const c = this.tryParseCompactGeometryParams(params, shapeKey);
        if (c) {
          heightMm = c.heightMm;
          lengthMm = c.lengthMm;
          widthMm = c.widthMm;
          diameterMm = c.diameterMm;
          thicknessMm = c.thicknessMm;
        }
      }

      const extractedAny = [heightMm, lengthMm, widthMm, diameterMm, thicknessMm].some((v) => v !== null);
      if (!extractedAny) {
        errors.push(
          `Строка ${rowNo}: Параметры не распознаны (старый формат: «В/Дл/Ш/Диам/Толщ …» или компактно: 20×20×3×6000 мм, ⌀32×2×6000 мм и т.п.).`
        );
        return;
      }

      const requireIf = (cond: boolean, msg: string): void => {
        if (!cond) errors.push(`Строка ${rowNo}: ${msg}`);
      };

      if (shapeKey === 'rectangular') {
        requireIf(heightMm !== null, 'для rectangular нужны значения В.');
        requireIf(lengthMm !== null, 'для rectangular нужны значения Дл.');
        requireIf(widthMm !== null, 'для rectangular нужны значения Ш.');
      } else if (shapeKey === 'cylindrical') {
        requireIf(diameterMm !== null, 'для cylindrical нужны значения Диам.');
        requireIf(lengthMm !== null, 'для cylindrical нужны значения Дл.');
      } else if (shapeKey === 'tube') {
        requireIf(diameterMm !== null, 'для tube нужны значения Диам.');
        requireIf(lengthMm !== null, 'для tube нужны значения Дл.');
        requireIf(thicknessMm !== null, 'для tube нужны значения Толщ.');
      } else if (shapeKey === 'plate') {
        requireIf(lengthMm !== null, 'для plate нужны значения Дл.');
        requireIf(widthMm !== null, 'для plate нужны значения Ш.');
        requireIf(thicknessMm !== null, 'для plate нужны значения Толщ.');
      }

      if (errors.length && errors[errors.length - 1].startsWith(`Строка ${rowNo}:`)) {
        // если в этой строке накопились ошибки — не добавляем запись
        const rowErrorsCount = errors.filter((e) => e.startsWith(`Строка ${rowNo}:`)).length;
        if (rowErrorsCount) return;
      }

      const nonNegative = (v: number | null): boolean => v === null || v >= 0;
      if (![heightMm, lengthMm, widthMm, diameterMm, thicknessMm].every(nonNegative)) {
        errors.push(`Строка ${rowNo}: параметры должны быть >= 0.`);
        return;
      }

      mapped.push({
        name,
        shapeKey,
        heightMm: heightMm ?? undefined,
        lengthMm: lengthMm ?? undefined,
        widthMm: widthMm ?? undefined,
        diameterMm: diameterMm ?? undefined,
        thicknessMm: thicknessMm ?? undefined,
        notes: '',
        isActive: true,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private parseExcelBool(raw: unknown, defaultTrue: boolean): boolean {
    if (raw === null || raw === undefined || raw === '') return defaultTrue;
    const s = String(raw).trim().toLowerCase();
    if (!s) return defaultTrue;
    if (['да', 'д', 'yes', 'y', '1', 'true'].includes(s)) return true;
    if (['нет', 'н', 'no', 'n', '0', 'false'].includes(s)) return false;
    return defaultTrue;
  }

  private validateAndMapWorkTypesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{
      name: string;
      shortLabel: string;
      hourlyRateRub: number;
      isActive: boolean;
    }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{
      name: string;
      shortLabel: string;
      hourlyRateRub: number;
      isActive: boolean;
    }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Наименование', 'Короткое обозначение', 'Ставка руб/ч', 'Активна'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    const seenInFile = new Set<string>();
    const existingNames = new Set(
      this.productionWorkTypesStore.items().map((x) => this.normalizeWorkTypeName(x.name))
    );

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Наименование'] ?? '').trim();
      const shortLabel = String(row['Короткое обозначение'] ?? '').trim();
      const rateRaw = this.parseNumberOrNull(row['Ставка руб/ч']);
      const isActive = this.parseExcelBool(row['Активна'], true);
      const nameKey = this.normalizeWorkTypeName(name);

      if (!name || !shortLabel) {
        errors.push(`Строка ${rowNo}: заполните Наименование и Короткое обозначение.`);
        return;
      }
      if (rateRaw === null) {
        errors.push(`Строка ${rowNo}: укажите числовую «Ставка руб/ч».`);
        return;
      }
      const hourlyRateRub = Math.round(rateRaw);
      if (hourlyRateRub < 1) {
        errors.push(`Строка ${rowNo}: «Ставка руб/ч» — целое число не меньше 1.`);
        return;
      }
      if (name.length < 2) {
        errors.push(`Строка ${rowNo}: Наименование — минимум 2 символа.`);
        return;
      }
      if (seenInFile.has(nameKey)) {
        errors.push(`Строка ${rowNo}: наименование «${name}» повторяется в файле.`);
        return;
      }
      seenInFile.add(nameKey);
      if (existingNames.has(nameKey)) {
        errors.push(`Строка ${rowNo}: наименование «${name}» уже есть в справочнике.`);
        return;
      }
      existingNames.add(nameKey);

      mapped.push({ name, shortLabel, hourlyRateRub, isActive });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapUnitsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ name: string; code: string; notes?: string; isActive: boolean }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ name: string; code: string; notes?: string; isActive: boolean }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Название', 'Код', 'Комментарий'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const name = String(row['Название'] ?? '').trim();
      const code = String(row['Код'] ?? '').trim();
      const notes = String(row['Комментарий'] ?? '').trim();

      if (!name) {
        errors.push(`Строка ${rowNo}: Название обязательно.`);
        return;
      }
      if (!code || code.length < 2) {
        errors.push(`Строка ${rowNo}: Код должен быть строкой длиной >= 2.`);
        return;
      }

      mapped.push({ name, code, notes, isActive: true });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapRolesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: RoleItemInput[];
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: RoleItemInput[] = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Код', 'Порядок', 'Название', 'Заметка', 'Активна'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    const codeRe = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    const reservedLower = new Set(this.rolesStore.items().map((r) => r.code.trim().toLowerCase()));

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      let code = String(row['Код'] ?? '').trim();
      const sortRaw = this.parseNumberOrNull(row['Порядок']);
      const name = String(row['Название'] ?? '').trim();
      const notes = String(row['Заметка'] ?? '').trim();
      const activeRaw = String(row['Активна'] ?? 'да').trim().toLowerCase();

      if (sortRaw === null || !Number.isInteger(sortRaw) || sortRaw < 1 || sortRaw > 999_999) {
        errors.push(`Строка ${rowNo}: «Порядок» — целое число от 1 до 999999.`);
        return;
      }

      if (!name || name.length < 2) {
        errors.push(`Строка ${rowNo}: Название — минимум 2 символа.`);
        return;
      }

      if (code) {
        if (!codeRe.test(code)) {
          errors.push(
            `Строка ${rowNo}: Код — латиница, с буквы, далее буквы/цифры/_ (мин. длина 2), либо оставьте ячейку пустой.`,
          );
          return;
        }
        if (code.length < 2) {
          errors.push(`Строка ${rowNo}: Код не короче 2 символов (или оставьте пустым — создастся из названия).`);
          return;
        }
        if (code.toLowerCase() === 'admin') {
          errors.push(`Строка ${rowNo}: код «admin» зарезервирован для суперадминистратора.`);
          return;
        }
      } else {
        code = allocateUniqueRoleCode(slugifyRoleCodeFromName(name), reservedLower);
      }

      let isActive = true;
      if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
        isActive = true;
      } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
        isActive = false;
      } else {
        errors.push(`Строка ${rowNo}: в «Активна» укажите да или нет.`);
        return;
      }

      const ck = code.toLowerCase();
      if (reservedLower.has(ck)) {
        errors.push(
          `Строка ${rowNo}: код «${code}» уже занят (в справочнике или повтор в файле выше).`,
        );
        return;
      }
      reservedLower.add(ck);

      mapped.push({
        code,
        name,
        sortOrder: sortRaw,
        notes: notes || undefined,
        isActive,
        isSystem: false,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapUsersRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: UserItemInput[];
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: UserItemInput[] = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Логин', 'ФИО', 'Email', 'Телефон', 'Код роли', 'Пароль'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    const rolesByCode = new Map(
      this.rolesStore.items().map((r) => [r.code.trim().toLowerCase(), r] as const),
    );
    const seenLogins = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const login = String(row['Логин'] ?? '').trim();
      const fullName = String(row['ФИО'] ?? '').trim();
      const email = String(row['Email'] ?? '').trim();
      const phone = String(row['Телефон'] ?? '').trim();
      const roleCode = String(row['Код роли'] ?? '').trim();
      const password = String(row['Пароль'] ?? '').trim();

      if (!login || login.length < 2) {
        errors.push(`Строка ${rowNo}: логин обязателен (минимум 2 символа).`);
        return;
      }
      const lk = login.toLowerCase();
      if (seenLogins.has(lk)) {
        errors.push(`Строка ${rowNo}: логин «${login}» повторяется в файле.`);
        return;
      }
      seenLogins.add(lk);
      if (this.usersStore.items().some((u) => u.login.trim().toLowerCase() === lk)) {
        errors.push(`Строка ${rowNo}: логин «${login}» уже есть в справочнике.`);
        return;
      }
      if (!fullName || fullName.length < 2) {
        errors.push(`Строка ${rowNo}: ФИО — минимум 2 символа.`);
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Строка ${rowNo}: проверьте формат email.`);
        return;
      }
      const role = rolesByCode.get(roleCode.toLowerCase());
      if (!role || !role.isActive) {
        errors.push(`Строка ${rowNo}: неизвестный или неактивный код роли «${roleCode}».`);
        return;
      }
      if (!password || password.length < 4) {
        errors.push(`Строка ${rowNo}: пароль обязателен, минимум 4 символа.`);
        return;
      }

      mapped.push({
        login,
        password,
        fullName,
        email,
        phone,
        roleId: role.id,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapSurfaceFinishesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ finishType: string; roughnessClass: string; raMicron?: number }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ finishType: string; roughnessClass: string; raMicron?: number }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Тип финиша', 'Шероховатость', 'Ra, мкм'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const finishType = String(row['Тип финиша'] ?? '').trim();
      const roughnessClass = String(row['Шероховатость'] ?? '').trim();
      const raMicron = this.parseNumberOrNull(row['Ra, мкм']);

      if (!finishType || !roughnessClass || raMicron === null) {
        errors.push(`Строка ${rowNo}: заполните Тип финиша/Шероховатость/Ra, мкм.`);
        return;
      }
      if (raMicron < 0) {
        errors.push(`Строка ${rowNo}: Ra, мкм должен быть >= 0.`);
        return;
      }

      mapped.push({ finishType, roughnessClass, raMicron });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapCoatingsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }> = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = ['Тип покрытия', 'Спецификация', 'Толщина, мкм'];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const coatingType = String(row['Тип покрытия'] ?? '').trim();
      const coatingSpec = String(row['Спецификация'] ?? '').trim();
      const thicknessMicron = this.parseNumberOrNull(row['Толщина, мкм']);

      if (!coatingType || !coatingSpec || thicknessMicron === null) {
        errors.push(`Строка ${rowNo}: заполните Тип покрытия/Спецификация/Толщина, мкм.`);
        return;
      }
      if (thicknessMicron < 0) {
        errors.push(`Строка ${rowNo}: Толщина, мкм должен быть >= 0.`);
        return;
      }

      mapped.push({ coatingType, coatingSpec, thicknessMicron });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private validateAndMapClientsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: ClientItemInput[];
    errors: string[];
  } {
    const errors: string[] = [];
    const mapped: ClientItemInput[] = [];

    if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

    const requiredHeaders = [
      'Фамилия',
      'Имя',
      'Отчество',
      'Адрес',
      'Телефон',
      'Email',
      'Наценка %',
      'Активен',
      'Заметки',
      'Паспорт серия',
      'Паспорт номер',
      'Кем выдан',
      'Дата выдачи',
    ];
    const firstKeys = Object.keys(rows[0] ?? {});
    const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
    if (missingHeaders.length) {
      return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
    }

    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const lastName = String(row['Фамилия'] ?? '').trim();
      const firstName = String(row['Имя'] ?? '').trim();
      const patronymic = String(row['Отчество'] ?? '').trim();
      const address = String(row['Адрес'] ?? '').trim();
      const phone = String(row['Телефон'] ?? '').trim();
      const email = String(row['Email'] ?? '').trim();
      const markupRaw = row['Наценка %'];
      const activeRaw = String(row['Активен'] ?? '')
        .trim()
        .toLowerCase();
      const notes = String(row['Заметки'] ?? '').trim();
      const passportSeries = String(row['Паспорт серия'] ?? '').trim();
      const passportNumber = String(row['Паспорт номер'] ?? '').trim();
      const passportIssuedBy = String(row['Кем выдан'] ?? '').trim();
      const passportIssuedDate = String(row['Дата выдачи'] ?? '').trim();

      if (!lastName) {
        errors.push(`Строка ${rowNo}: укажите фамилию.`);
        return;
      }
      if (!firstName) {
        errors.push(`Строка ${rowNo}: укажите имя.`);
        return;
      }

      let clientMarkupPercent: number | null = null;
      if (markupRaw !== '' && markupRaw !== null && markupRaw !== undefined) {
        const n = this.parseNumberOrNull(markupRaw);
        if (n === null) {
          errors.push(`Строка ${rowNo}: «Наценка %» должна быть числом или пусто.`);
          return;
        }
        if (n < 0 || n > 1000) {
          errors.push(`Строка ${rowNo}: наценка в диапазоне 0…1000 %.`);
          return;
        }
        clientMarkupPercent = Math.round(n);
      }

      let isActiveRow = true;
      if (!activeRaw) {
        isActiveRow = true;
      } else if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
        isActiveRow = true;
      } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
        isActiveRow = false;
      } else {
        errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
        return;
      }

      mapped.push({
        lastName,
        firstName,
        patronymic,
        address,
        phone,
        email,
        notes,
        clientMarkupPercent,
        passportSeries,
        passportNumber,
        passportIssuedBy,
        passportIssuedDate,
        isActive: isActiveRow,
      });
    });

    if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
    return { ok: true, rows: mapped, errors: [] };
  }

  private applyGeometryShapeValidators(shape: string): void {
    const c = this.geometriesForm.controls;
    const optionalNonNegative = [Validators.min(0)];
    const requiredNonNeg = [Validators.required, ...optionalNonNegative];
    const keys: GeometryDimKey[] = ['heightMm', 'lengthMm', 'widthMm', 'diameterMm', 'thicknessMm'];

    for (const key of keys) {
      const control = c[key];
      control.clearValidators();
      if (!isGeometryDimensionVisible(shape, key)) {
        control.setValidators(optionalNonNegative);
        control.updateValueAndValidity({ emitEvent: false });
        continue;
      }
      if (isGeometryDimensionRequired(shape, key)) {
        control.setValidators(requiredNonNeg);
      } else {
        control.setValidators(optionalNonNegative);
      }
      control.updateValueAndValidity({ emitEvent: false });
    }
  }
}

