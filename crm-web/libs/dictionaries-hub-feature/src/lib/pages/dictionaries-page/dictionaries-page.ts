import { DOCUMENT, Location, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { LucidePlus, LucideX } from '@lucide/angular';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  Observable,
  Subscription,
  filter,
  finalize,
  firstValueFrom,
  forkJoin,
  map,
  of,
  startWith,
} from 'rxjs';
import { PermissionsService } from '@srm/authz-runtime';
import { permissionKeyForDictionaryHubTile } from '@srm/authz-core';
import { DictionaryStandaloneCreateShellComponent } from '../../components/dictionary-standalone-create-shell/dictionary-standalone-create-shell.component';
import { DictionariesMaterialStandaloneFlowService } from '../../dictionaries-material-standalone-flow.service';
import {
  STANDALONE_DICTIONARY_CREATE,
  isStandaloneDictionaryCreateKey,
  type StandaloneDictionaryCreateKey,
} from '../../standalone-dictionary-create.meta';
import { callStandaloneCloseForKey } from '../../standalone-dictionary-create.back';
import { NewMaterialFullscreenPageComponent } from '../../components/new-material-fullscreen-page/new-material-fullscreen-page.component';
import { HUB_BOARD_DICTIONARY_ROW_DEFS } from '../../dictionaries-hub/dictionaries-hub-board.config';
import {
  buildHubBoardSectionColumns,
  filterHubBoardRowsByPermission,
  splitHubBoardPickerHalves,
} from '../../dictionaries-hub/dictionaries-hub-board';
import { resolveHubBoardQuickCreate } from '../../dictionaries-hub/dictionaries-hub-quick-create.registry';
import { scrollToFirstInvalidControlInForm } from '../../dictionaries-form-a11y';
import {
  CLIENTS_COLUMNS,
  CLIENTS_COLUMNS_FULL,
  COATINGS_COLUMNS,
  COATINGS_COLUMNS_FULL,
  COLORS_COLUMNS,
  COLORS_COLUMNS_FULL,
  GEOMETRIES_COLUMNS,
  GEOMETRIES_COLUMNS_FULL,
  KP_PHOTOS_COLUMNS,
  KP_PHOTOS_COLUMNS_FULL,
  MATERIAL_CHARACTERISTICS_COLUMNS_FULL,
  MATERIAL_CHARACTERISTICS_COLUMNS_PREVIEW,
  MATERIALS_COLUMNS_FULL,
  MATERIALS_COLUMNS_PREVIEW,
  ORGANIZATIONS_COLUMNS,
  ORGANIZATIONS_COLUMNS_FULL,
  ROLES_COLUMNS,
  ROLES_COLUMNS_FULL,
  SURFACE_FINISHES_COLUMNS,
  SURFACE_FINISHES_COLUMNS_FULL,
  UNITS_COLUMNS,
  UNITS_COLUMNS_FULL,
  USERS_COLUMNS,
  USERS_COLUMNS_FULL,
  WORK_TYPES_COLUMNS,
  WORK_TYPES_COLUMNS_FULL,
  PRODUCTION_DETAILS_COLUMNS,
  PRODUCTION_DETAILS_COLUMNS_FULL,
} from './dictionaries-page-table-columns';
import {
  mapLegalFormToOrganizationKind,
  normalizeRalCode,
  normalizeWorkTypeName,
  organizationKindToLegalForm,
  parseNumberOrNull,
} from './dictionaries-page-form-utils';
import {
  clientPayloadFromForm,
  coatingPayloadFromValues,
  colorsPayloadFromFormRaw,
  geometriesPayloadFromValues,
  kpPhotosPayloadFromValues,
  materialCharacteristicsPayloadFromValues,
  materialsPayloadFromValues,
  productionDetailsPayloadFromValues,
  organizationsPayloadFromFields,
  surfaceFinishPayloadFromValues,
  unitsPayloadFromValues,
  workTypesPayloadFromValues,
} from './dictionaries-page-payload-builders';
import { validateAndMapColorRows as validateAndMapColorRowsFn } from './dictionaries-page-excel-validate-colors';
import { validateAndMapMaterialsRows as validateAndMapMaterialsRowsFn } from './dictionaries-page-excel-validate-materials';
import { validateAndMapMaterialCharacteristicsRows as validateAndMapMaterialCharacteristicsRowsFn } from './dictionaries-page-excel-validate-material-characteristics';
import { validateAndMapGeometriesRows as validateAndMapGeometriesRowsFn } from './dictionaries-page-excel-validate-geometries';
import { validateAndMapWorkTypesRows as validateAndMapWorkTypesRowsFn } from './dictionaries-page-excel-validate-work-types';
import { validateAndMapProductionDetailsRows as validateAndMapProductionDetailsRowsFn } from './dictionaries-page-excel-validate-production-details';
import { validateAndMapUnitsRows as validateAndMapUnitsRowsFn } from './dictionaries-page-excel-validate-units';
import { validateAndMapRolesRows as validateAndMapRolesRowsFn } from './dictionaries-page-excel-validate-roles';
import { validateAndMapUsersRows as validateAndMapUsersRowsFn } from './dictionaries-page-excel-validate-users';
import { validateAndMapSurfaceFinishesRows as validateAndMapSurfaceFinishesRowsFn } from './dictionaries-page-excel-validate-surface-finishes';
import { validateAndMapCoatingsRows as validateAndMapCoatingsRowsFn } from './dictionaries-page-excel-validate-coatings';
import { validateAndMapClientsRows as validateAndMapClientsRowsFn } from './dictionaries-page-excel-validate-clients';
import { validateAndMapOrganizationsRows as validateAndMapOrganizationsRowsFn } from './dictionaries-page-excel-validate-organizations';
import {
  ClientsStore,
  CoatingsStore,
  ColorsStore,
  GeometriesStore,
  KpPhotosStore,
  MaterialCharacteristicsStore,
  MaterialsStore,
  OrganizationsStore,
  ProductionDetailsStore,
  ProductionWorkTypesStore,
  RolesStore,
  SurfaceFinishesStore,
  UnitsStore,
  UsersStore,
} from '@srm/dictionaries-state';
import {
  GEOMETRY_DIAMETER_LABEL,
  GeometryDimKey,
  MaterialCharacteristicsImportDraftRow,
  MissingReferencePlan,
  ReferenceSnapshot,
  allocateUniqueRoleCode,
  formatGeometryParamsDisplay,
  isGeometryDimensionRequired,
  isGeometryDimensionVisible,
  materialCharacteristicsDraftsToPayload,
  nextRoleSortOrder,
  planMissingReferencesForMaterialCharacteristicsImport,
  SEEDED_ROLE_CODES_LOWER,
  slugifyRoleCodeFromName,
  computeProductionDetailTotals,
} from '@srm/dictionaries-utils';
import type { MaterialItem, MaterialItemInput } from '@srm/materials-data-access';
import type { ProductionDetailItemInput } from '@srm/production-details-data-access';
import { type ClientItemInput, formatClientFio } from '@srm/clients-data-access';
import { OrganizationItem, OrganizationItemInput } from '@srm/organizations-data-access';
import {
  MATERIAL_CHARACTERISTICS_REPOSITORY,
  type MaterialCharacteristicItem,
  type MaterialCharacteristicItemInput,
  type MaterialCharacteristicsRepository,
} from '@srm/material-characteristics-data-access';
import { COLORS_REPOSITORY } from '@srm/colors-data-access';
import { COATINGS_REPOSITORY } from '@srm/coatings-data-access';
import { SURFACE_FINISHES_REPOSITORY } from '@srm/surface-finishes-data-access';
import { RoleItemInput } from '@srm/roles-data-access';
import { ROLE_ID_SYSTEM_ADMIN } from '@srm/roles-data-access';
import { UserItemInput } from '@srm/users-data-access';
import {
  ContentCardComponent,
  CrudLayoutComponent,
  DictionaryPreviewCardComponent,
  DictionaryPreviewCardNoPhotoComponent,
  HexRgbFieldComponent,
  HubCrudExpandStateService,
  LinkedDictionaryPropagationConfirmComponent,
  PageShellComponent,
  TableColumn,
  UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB,
  UiButtonComponent,
  UiCheckboxFieldComponent,
  UiFormFieldComponent,
  UiFormGridComponent,
  UiModal as UiModalComponent,
  UiModalFormActionsComponent,
} from '@srm/ui-kit';
@Component({
  selector: 'app-dictionaries-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgTemplateOutlet,
    ReactiveFormsModule,
    PageShellComponent,
    ContentCardComponent,
    CrudLayoutComponent,
    DictionaryPreviewCardComponent,
    DictionaryPreviewCardNoPhotoComponent,
    UiModalComponent,
    UiModalFormActionsComponent,
    UiFormGridComponent,
    UiButtonComponent,
    UiCheckboxFieldComponent,
    UiFormFieldComponent,
    HexRgbFieldComponent,
    LucidePlus,
    LucideX,
    LinkedDictionaryPropagationConfirmComponent,
    DictionaryStandaloneCreateShellComponent,
    NewMaterialFullscreenPageComponent,
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
  /** При дублировании контакта переносим наценку в создаваемую запись (поле убрано из формы). */
  private clientsMarkupOnCreate: number | null = null;

  private readonly materialsSnapshotSyncGate: {
    color: 'local' | 'global' | null;
    surfaceFinish: 'local' | 'global' | null;
    coating: 'local' | 'global' | null;
  } = { color: null, surfaceFinish: null, coating: null };

  readonly permissions = inject(PermissionsService);
  readonly hubTilePerm = permissionKeyForDictionaryHubTile;

  readonly hubExpand = inject(HubCrudExpandStateService);

  /** Выбранный справочник в мастер-таблице хаба (доска + деталь ниже). */
  readonly hubBoardSelectedKey = signal<string | null>(null);

  /** Строки мастер-таблицы: раздел и справочник (с учётом прав). */
  readonly hubBoardRows = computed(() =>
    filterHubBoardRowsByPermission(HUB_BOARD_DICTIONARY_ROW_DEFS, (tileKey) =>
      this.permissions.can(this.hubTilePerm(tileKey)),
    ),
  );

  /** Колонки быстрого выбора: секция сверху, ниже — компактные кнопки справочников. */
  readonly hubBoardSectionColumns = computed(() => buildHubBoardSectionColumns(this.hubBoardRows()));

  /**
   * Две половины верхнего блока (пополам по ширине); в каждой — до двух колонок секций.
   * Итог на широком экране: 2×2 относительно четырёх секций.
   */
  readonly hubBoardPickerHalves = computed(() => splitHubBoardPickerHalves(this.hubBoardSectionColumns()));

  /** Высота тела таблицы в панели деталей (как у развёрнутой плитки). */
  readonly hubBoardDetailTableMaxHeight = this.hubExpand.expandedTableBodyMaxHeight;

  private readonly syncHubBoardSelection = effect(() => {
    const rows = this.hubBoardRows();
    const key = this.hubBoardSelectedKey();
    if (!rows.length) {
      if (key !== null) {
        this.hubBoardSelectedKey.set(null);
      }
      return;
    }
    if (key === null || !rows.some((r) => r.key === key)) {
      this.hubBoardSelectedKey.set(rows[0].key);
    }
  });

  selectHubBoardRow(key: string, event?: Event): void {
    event?.preventDefault();
    this.hubBoardSelectedKey.set(key);
  }

  isHubBoardRowSelected(key: string): boolean {
    return this.hubBoardSelectedKey() === key;
  }

  /** «+» у строки быстрого выбора: переключает плитку и открывает создание для этого справочника. */
  onHubBoardQuickCreate(key: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.permissions.crud().canCreate) return;
    this.hubBoardSelectedKey.set(key);
    const target = resolveHubBoardQuickCreate(key);
    if (!target) {
      return;
    }
    switch (target.kind) {
      case 'newMaterialPage':
        this.navigateToNewMaterialPage();
        break;
      case 'newMaterialCharacteristicPage':
        this.navigateToNewMaterialCharacteristicPage();
        break;
      case 'standalone':
        this.navigateToStandaloneDictionaryCreate(target.key);
        break;
    }
  }
  readonly rolesStore = inject(RolesStore);
  readonly usersStore = inject(UsersStore);
  readonly materialsStore = inject(MaterialsStore);
  readonly geometriesStore = inject(GeometriesStore);
  readonly unitsStore = inject(UnitsStore);
  readonly kpPhotosStore = inject(KpPhotosStore);
  readonly colorsStore = inject(ColorsStore);
  readonly coatingsStore = inject(CoatingsStore);
  readonly surfaceFinishesStore = inject(SurfaceFinishesStore);
  readonly productionWorkTypesStore = inject(ProductionWorkTypesStore);
  readonly productionDetailsStore = inject(ProductionDetailsStore);
  readonly clientsStore = inject(ClientsStore);
  readonly organizationsStore = inject(OrganizationsStore);
  readonly materialCharacteristicsStore = inject(MaterialCharacteristicsStore);
  private readonly colorsRepository = inject(COLORS_REPOSITORY);
  private readonly surfaceFinishesRepository = inject(SURFACE_FINISHES_REPOSITORY);
  private readonly coatingsRepository = inject(COATINGS_REPOSITORY);
  private readonly materialCharacteristicsRepository = inject<MaterialCharacteristicsRepository>(
    MATERIAL_CHARACTERISTICS_REPOSITORY
  );

  readonly isWorkTypesModalOpen = signal(false);
  readonly isProductionDetailsModalOpen = signal(false);
  readonly isProductionDetailsViewMode = signal(false);
  readonly isMaterialCharacteristicsModalOpen = signal(false);
  readonly isMaterialCharacteristicsViewMode = signal(false);
  readonly isMaterialsModalOpen = signal(false);
  readonly isGeometriesModalOpen = signal(false);
  readonly isUnitsModalOpen = signal(false);
  readonly isKpPhotosModalOpen = signal(false);
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
  readonly isOrganizationsModalOpen = signal(false);
  readonly isSurfaceFinishesModalOpen = signal(false);
  readonly isMaterialsViewMode = signal(false);
  readonly isGeometriesViewMode = signal(false);
  readonly isUnitsViewMode = signal(false);
  readonly isKpPhotosViewMode = signal(false);
  readonly isColorsViewMode = signal(false);
  readonly isCoatingsViewMode = signal(false);
  readonly isClientsViewMode = signal(false);
  readonly isOrganizationsViewMode = signal(false);
  readonly isSurfaceFinishesViewMode = signal(false);
  readonly isWorkTypesViewMode = signal(false);
  readonly isRolesModalOpen = signal(false);
  readonly isRolesViewMode = signal(false);
  readonly rolesEditingId = signal<string | null>(null);
  readonly rolesSubmitAttempted = signal(false);
  /**
   * Уникальный id формы ролей: одна и та же разметка (#rolesContentTpl) в модалке и на standalone-маршруте.
   * Дублирующий id="roles-form" в DOM давал лишние сабмиты и несколько POST на одно действие.
   */
  readonly rolesFormDomId = signal('roles-form--modal');
  private rolesSubmitInFlight = false;
  readonly isUsersModalOpen = signal(false);
  readonly isUsersViewMode = signal(false);
  readonly usersEditingId = signal<string | null>(null);
  readonly usersSubmitAttempted = signal(false);
  readonly colorQuickAddForMaterialCharacteristics = signal(false);
  readonly unitQuickAddForMaterials = signal(false);
  /** После «+» у поставщика в форме материала — подставить созданную организацию в `supplierOrganizationId`. */
  readonly organizationQuickAddForMaterials = signal(false);
  /** Материал создан из формы детали (модалка поверх) — подставить в пресет «по материалу». */
  readonly materialQuickAddForProductionDetails = signal(false);
  /** Каскад: модалка «Материал» открыта, плитка справочника — поверх (z-index). */
  readonly materialCharacteristicsHubStackAboveModal = signal(false);
  /** Модалка «Новая геометрия» открыта из формы материала — поднять слой выше модалки материала. */
  readonly geometriesModalStackAboveMaterials = signal(false);
  readonly coatingQuickAddForMaterialCharacteristics = signal(false);
  readonly surfaceQuickAddForMaterialCharacteristics = signal(false);
  readonly excelImportStatus = signal('');

  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  /** Цепочка «Новый материал» → характеристика: состояние вне экземпляра страницы (см. сервис). */
  private readonly materialStandaloneFlow = inject(DictionariesMaterialStandaloneFlowService);
  /** Полноэкранный маршрут `/справочники/новый-материал` (форма материала без модалки). */
  readonly isNewMaterialPageRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.snapshot.data['newMaterialPage'] === true),
    ),
    { initialValue: this.route.snapshot.data['newMaterialPage'] === true },
  );

  /** Полноэкранный маршрут `/справочники/новая-характеристика-материала`. */
  readonly isNewMaterialCharacteristicPageRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.snapshot.data['newMaterialCharacteristicPage'] === true),
    ),
    { initialValue: this.route.snapshot.data['newMaterialCharacteristicPage'] === true },
  );

  /** Полноэкранное создание (`data.standaloneCreate`) — см. `STANDALONE_DICTIONARY_CREATE`. */
  readonly standaloneCreateKey = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map((): StandaloneDictionaryCreateKey | null => {
        const raw = this.route.snapshot.data['standaloneCreate'];
        return isStandaloneDictionaryCreateKey(raw) ? raw : null;
      }),
    ),
    {
      initialValue: isStandaloneDictionaryCreateKey(this.route.snapshot.data['standaloneCreate'])
        ? this.route.snapshot.data['standaloneCreate']
        : null,
    },
  );

  standaloneDictionaryTitle(key: StandaloneDictionaryCreateKey): string {
    return STANDALONE_DICTIONARY_CREATE.find((x) => x.key === key)?.title ?? '';
  }

  /** После успешного submit на полноэкранном create — шаг назад по истории (канон playbook). */
  private finishStandaloneDictionaryCreateIfMatch(key: StandaloneDictionaryCreateKey): void {
    if (this.standaloneCreateKey() !== key) return;
    this.location.back();
  }

  /**
   * Роли / пользователи: на standalone открыт только create; submit редактирования идёт из модалки на хабе.
   */
  private finishStandaloneDictionaryCreateIfMatchCreateOnly(
    key: 'roles' | 'users',
    editId: string | null,
  ): void {
    if (this.standaloneCreateKey() !== key || editId != null) return;
    this.location.back();
  }

  /** Подсказка для раскраски баннера Excel на хабе. */
  /**
   * Модалка формы характеристик выше каскадной плитки на body (z-index 1700), иначе «+» открывает форму сзади.
   */
  readonly materialCharacteristicsFormModalBackdropZIndex = computed((): number | null => {
    const hubOpen = this.hubBoardSelectedKey() === 'materialCharacteristics';
    if (!this.materialCharacteristicsHubStackAboveModal() || !hubOpen) {
      return null;
    }
    return UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB;
  });

  /** Заголовок модалки просмотра: имя позиции из записи, без «Мат.» в шапке. */
  readonly materialsViewHeadline = signal('');

  readonly materialsModalTitle = computed(() => {
    if (!this.isMaterialsModalOpen()) return '';
    if (this.isMaterialsViewMode()) {
      const h = this.materialsViewHeadline().trim();
      return h ? `Просмотр · ${h}` : 'Просмотр материала';
    }
    if (this.materialsStore.isEditMode()) return 'Редактирование материала';
    return 'Новый материал';
  });

  readonly materialCharacteristicsModalTitle = computed(() => {
    if (!this.isMaterialCharacteristicsModalOpen()) return '';
    if (this.isMaterialCharacteristicsViewMode()) return 'Просмотр характеристики материала';
    if (this.materialCharacteristicsStore.isEditMode()) return 'Редактирование характеристики материала';
    return 'Новая характеристика материала';
  });

  /** Модалка геометрии поверх модалки материала (оба на body). */
  readonly geometriesFormModalBackdropZIndex = computed((): number | null => {
    if (!this.geometriesModalStackAboveMaterials()) return null;
    return UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB;
  });

  /** Модалка материала поверх модалки «Деталь» (создание материала из пресета). */
  readonly materialsFormModalBackdropZIndex = computed((): number | null => {
    if (!this.materialQuickAddForProductionDetails() || !this.isProductionDetailsModalOpen()) return null;
    return UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB;
  });

  /** Организация из «+» у поставщика — выше модалки материала (уже 1800). */
  readonly organizationsFormModalBackdropZIndex = computed((): number | null => {
    if (!this.organizationQuickAddForMaterials() || !this.isMaterialsModalOpen()) return null;
    return UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB + 100;
  });

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

  /** Статус Excel/импорта — только на хабе; на полноэкранных маршрутах не показываем (бэклог #44). */
  readonly showExcelImportStatusBanner = computed(() => {
    if (this.standaloneCreateKey() !== null) return false;
    if (this.isNewMaterialPageRoute()) return false;
    if (this.isNewMaterialCharacteristicPageRoute()) return false;
    return true;
  });

  /** Подтверждение: добавить отсутствующие в малых справочниках позиции перед импортом характеристик. */
  readonly mcImportAssistOpen = signal(false);
  readonly mcImportAssistLines = signal<string[]>([]);
  private mcImportPendingPlan: MissingReferencePlan | null = null;
  private mcImportPendingDrafts: MaterialCharacteristicsImportDraftRow[] = [];

  readonly workTypesColumns = WORK_TYPES_COLUMNS;
  readonly workTypesColumnsFull = WORK_TYPES_COLUMNS_FULL;
  readonly productionDetailsColumns = PRODUCTION_DETAILS_COLUMNS;
  readonly productionDetailsColumnsFull = PRODUCTION_DETAILS_COLUMNS_FULL;
  readonly materialCharacteristicsColumnsPreview = MATERIAL_CHARACTERISTICS_COLUMNS_PREVIEW;
  readonly materialCharacteristicsColumnsFull = MATERIAL_CHARACTERISTICS_COLUMNS_FULL;
  readonly materialsColumnsPreview = MATERIALS_COLUMNS_PREVIEW;
  readonly materialsColumnsFull = MATERIALS_COLUMNS_FULL;
  readonly geometriesColumns = GEOMETRIES_COLUMNS;
  readonly geometriesColumnsFull = GEOMETRIES_COLUMNS_FULL;
  readonly unitsColumns = UNITS_COLUMNS;
  readonly unitsColumnsFull = UNITS_COLUMNS_FULL;
  readonly kpPhotosColumns = KP_PHOTOS_COLUMNS;
  readonly kpPhotosColumnsFull = KP_PHOTOS_COLUMNS_FULL;
  readonly colorsColumns = COLORS_COLUMNS;
  readonly colorsColumnsFull = COLORS_COLUMNS_FULL;
  readonly surfaceFinishesColumns = SURFACE_FINISHES_COLUMNS;
  readonly surfaceFinishesColumnsFull = SURFACE_FINISHES_COLUMNS_FULL;
  readonly coatingsColumns = COATINGS_COLUMNS;
  readonly coatingsColumnsFull = COATINGS_COLUMNS_FULL;
  readonly clientsColumns = CLIENTS_COLUMNS;
  readonly clientsColumnsFull = CLIENTS_COLUMNS_FULL;
  readonly organizationsColumns = ORGANIZATIONS_COLUMNS;
  readonly organizationsColumnsFull = ORGANIZATIONS_COLUMNS_FULL;
  readonly rolesColumns = ROLES_COLUMNS;
  readonly rolesColumnsFull = ROLES_COLUMNS_FULL;
  readonly usersColumns = USERS_COLUMNS;
  readonly usersColumnsFull = USERS_COLUMNS_FULL;

  /**
   * Колонки таблицы: на хабе-доске выбранный справочник — полный набор; иначе короткий превью-набор.
   * Для демо/ui-demo с раскрытием плитки — по `hubExpand.isOpen(tileKey)`.
   */
  private readonly columnsForTile = <T extends TableColumn>(
    tileKey: string,
    shortCols: T[],
    fullCols: T[],
  ) =>
    computed((): T[] => {
      const selected = this.hubBoardSelectedKey();
      const useFull = this.hubExpand.isOpen(tileKey) || selected === tileKey;
      return [...(useFull ? fullCols : shortCols)];
    });

  /**
   * В свернутой карточке скрываем строки таблицы (0),
   * в раскрытой — штатный лимит из HubCrudExpandStateService.
   */
  previewRows(tileKey: string): number | null {
    return this.hubExpand.isOpen(tileKey) ? this.hubExpand.previewMaxTableBodyRows(tileKey) : 0;
  }

  readonly workTypesColumnsForTile = this.columnsForTile('workTypes', this.workTypesColumns, this.workTypesColumnsFull);
  readonly productionDetailsColumnsForTile = this.columnsForTile(
    'productionDetails',
    this.productionDetailsColumns,
    this.productionDetailsColumnsFull,
  );
  readonly unitsColumnsForTile = this.columnsForTile('units', this.unitsColumns, this.unitsColumnsFull);
  readonly kpPhotosColumnsForTile = this.columnsForTile('kpPhotos', this.kpPhotosColumns, this.kpPhotosColumnsFull);
  readonly clientsColumnsForTile = this.columnsForTile('clients', this.clientsColumns, this.clientsColumnsFull);
  readonly organizationsColumnsForTile = this.columnsForTile(
    'organizations',
    this.organizationsColumns,
    this.organizationsColumnsFull,
  );
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

  readonly organizationContactSelectOptions = computed(() => this.clientsStore.options());

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
    supplierOrganizationId: [''],
    purchasePriceRub: [0, [Validators.required, Validators.min(1)]],
    notes: [''],
    isActive: [true],
  });

  readonly productionDetailsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    qty: [1 as number, [Validators.required, Validators.min(0.0001)]],
    notes: [''],
    isActive: [true],
    sourceMaterialId: [''],
    sourceWorkTypeId: [''],
    snapshotMaterialName: [''],
    snapshotMaterialCode: [''],
    snapshotUnitCode: [''],
    snapshotUnitName: [''],
    snapshotPurchasePriceRub: [null as number | null],
    snapshotDensityKgM3: [null as number | null],
    snapshotHeightMm: [null as number | null],
    snapshotLengthMm: [null as number | null],
    snapshotWidthMm: [null as number | null],
    snapshotDiameterMm: [null as number | null],
    snapshotThicknessMm: [null as number | null],
    snapshotCharacteristicName: [''],
    snapshotWorkTypeName: [''],
    snapshotWorkShortLabel: [''],
    snapshotHourlyRateRub: [null as number | null],
    workTimeHours: [null as number | null],
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

  readonly kpPhotosForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    organizationId: ['', Validators.required],
    photoTitle: ['', [Validators.required, Validators.minLength(1)]],
    photoUrl: ['', Validators.required],
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
    passportSeries: [''],
    passportNumber: [''],
    passportIssuedBy: [''],
    passportIssuedDate: [''],
    isActive: [true],
  });

  readonly organizationsForm = this.fb.nonNullable.group({
    organizationKind: this.fb.nonNullable.control<'OOO' | 'IP'>('OOO'),
    name: ['', [Validators.required, Validators.minLength(2)]],
    shortName: [''],
    inn: [''],
    kpp: [''],
    ogrn: [''],
    okpo: [''],
    phone: [''],
    email: [''],
    website: [''],
    legalAddress: [''],
    postalAddress: [''],
    bankName: [''],
    bankBik: [''],
    bankAccount: [''],
    bankCorrAccount: [''],
    signerName: [''],
    signerPosition: [''],
    notes: [''],
    contactIds: this.fb.nonNullable.control<string[]>([]),
    /** Одноразовый выбор из выпадающего списка — добавляет id в `contactIds`, затем сбрасывается. */
    contactPicker: [''],
    isActive: [true],
  });

  constructor() {
    // Русское название в заголовке вкладки браузера.
    this.doc.title = 'Справочники — CRM';

    /**
     * Для специальных полноэкранных сценариев (материал/характеристика) достаточно
     * одноразовой инициализации после первого рендера экземпляра страницы.
     */
    afterNextRender(() => {
      if (this.route.snapshot.data['newMaterialPage'] === true) {
        this.initNewMaterialStandaloneForm();
      }
      if (this.route.snapshot.data['newMaterialCharacteristicPage'] === true) {
        this.initNewMaterialCharacteristicStandaloneForm();
      }
      if (isDevMode() && this.route.snapshot.queryParamMap.has('debug')) {
        console.debug('[dictionaries] ?debug=', {
          data: this.route.snapshot.data,
          path: this.route.snapshot.routeConfig?.path,
        });
      }
    });

    /**
     * Standalone-create может открываться/закрываться в рамках одного экземпляра страницы:
     * при каждом заходе переинициализируем форму, чтобы не переносить touched/dirty между заходами.
     */
    effect(() => {
      if (!this.standaloneCreateKey()) return;
      this.initStandaloneDictionaryCreateFromRoute();
    });

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
    this.kpPhotosStore.loadItems();
    this.colorsStore.loadItems();
    this.coatingsStore.loadItems();
    this.surfaceFinishesStore.loadItems();
    this.productionWorkTypesStore.loadItems();
    this.productionDetailsStore.loadItems();
    this.clientsStore.loadItems();
    this.organizationsStore.loadItems();

    this.sub.add(
      this.workTypesForm.controls.name.valueChanges.subscribe(() => {
        const c = this.workTypesForm.controls.name;
        const err = c.errors;
        if (err?.['duplicate']) {
          const rest = { ...err };
          delete rest['duplicate'];
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
    this.sub.add(
      this.organizationsForm.controls.organizationKind.valueChanges.subscribe((k) => {
        if (k === 'IP') {
          this.organizationsForm.controls.kpp.setValue('', { emitEvent: false });
        }
      })
    );

    effect(() => {
      const key = this.hubBoardSelectedKey();
      if (key !== 'materialCharacteristics') {
        this.materialCharacteristicsHubStackAboveModal.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  openWorkTypesCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('workTypes');
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
      scrollToFirstInvalidControlInForm('work-types-form', this.doc);
      return;
    }
    const nameKey = normalizeWorkTypeName(payload.name);
    const editId = this.productionWorkTypesStore.editId();
    const hasDup = this.productionWorkTypesStore
      .items()
      .some((x) => x.id !== editId && normalizeWorkTypeName(x.name) === nameKey);
    if (hasDup) {
      nameCtrl.setErrors({ ...(nameCtrl.errors ?? {}), duplicate: true });
      this.productionWorkTypesStore.submit({ value: payload, isValid: false });
      this.workTypesForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('work-types-form', this.doc);
      return;
    }
    this.productionWorkTypesStore.submit({ value: payload, isValid: true });
    this.closeWorkTypesModal();
    this.finishStandaloneDictionaryCreateIfMatch('workTypes');
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

  isProductionDetailsInvalid(controlName: keyof typeof this.productionDetailsForm.controls): boolean {
    const control = this.productionDetailsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.productionDetailsStore.formSubmitAttempted())
    );
  }

  productionDetailsNameErrorText(): string {
    const c = this.productionDetailsForm.controls.name;
    if (
      !c.invalid ||
      !(c.touched || c.dirty || this.productionDetailsStore.formSubmitAttempted())
    ) {
      return '';
    }
    if (c.hasError('required')) return 'Укажите наименование';
    if (c.hasError('minlength')) return 'Минимум 2 символа';
    return 'Проверьте наименование';
  }

  private buildWorkTypesPayload() {
    const c = this.workTypesForm.controls;
    return workTypesPayloadFromValues({
      name: c.name.value,
      shortLabel: c.shortLabel.value,
      hourlyRateRub: c.hourlyRateRub.value,
      isActive: c.isActive.value,
    });
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

  openProductionDetailsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('productionDetails');
  }

  closeProductionDetailsModal(): void {
    this.productionDetailsStore.resetForm();
    this.isProductionDetailsViewMode.set(false);
    this.isProductionDetailsModalOpen.set(false);
  }

  private resetProductionDetailsCreateForm(): void {
    this.isProductionDetailsViewMode.set(false);
    this.productionDetailsForm.enable({ emitEvent: false });
    this.productionDetailsStore.startCreate();
    this.productionDetailsForm.reset({
      name: '',
      code: '',
      qty: 1,
      notes: '',
      isActive: true,
      sourceMaterialId: '',
      sourceWorkTypeId: '',
      snapshotMaterialName: '',
      snapshotMaterialCode: '',
      snapshotUnitCode: '',
      snapshotUnitName: '',
      snapshotPurchasePriceRub: null,
      snapshotDensityKgM3: null,
      snapshotHeightMm: null,
      snapshotLengthMm: null,
      snapshotWidthMm: null,
      snapshotDiameterMm: null,
      snapshotThicknessMm: null,
      snapshotCharacteristicName: '',
      snapshotWorkTypeName: '',
      snapshotWorkShortLabel: '',
      snapshotHourlyRateRub: null,
      workTimeHours: null,
    });
  }

  openProductionDetailsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isProductionDetailsViewMode.set(false);
    this.productionDetailsForm.enable({ emitEvent: false });
    const item = this.productionDetailsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.productionDetailsStore.startEdit(item.id);
    this.productionDetailsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      qty: item.qty ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
      sourceMaterialId: item.sourceMaterialId ?? '',
      sourceWorkTypeId: item.sourceWorkTypeId ?? '',
      snapshotMaterialName: item.snapshotMaterialName ?? '',
      snapshotMaterialCode: item.snapshotMaterialCode ?? '',
      snapshotUnitCode: item.snapshotUnitCode ?? '',
      snapshotUnitName: item.snapshotUnitName ?? '',
      snapshotPurchasePriceRub: item.snapshotPurchasePriceRub ?? null,
      snapshotDensityKgM3: item.snapshotDensityKgM3 ?? null,
      snapshotHeightMm: item.snapshotHeightMm ?? null,
      snapshotLengthMm: item.snapshotLengthMm ?? null,
      snapshotWidthMm: item.snapshotWidthMm ?? null,
      snapshotDiameterMm: item.snapshotDiameterMm ?? null,
      snapshotThicknessMm: item.snapshotThicknessMm ?? null,
      snapshotCharacteristicName: item.snapshotCharacteristicName ?? '',
      snapshotWorkTypeName: item.snapshotWorkTypeName ?? '',
      snapshotWorkShortLabel: item.snapshotWorkShortLabel ?? '',
      snapshotHourlyRateRub: item.snapshotHourlyRateRub ?? null,
      workTimeHours: item.workTimeHours ?? null,
    });
    this.isProductionDetailsModalOpen.set(true);
  }

  openProductionDetailsView(id: string): void {
    const item = this.productionDetailsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.productionDetailsStore.resetForm();
    this.productionDetailsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      qty: item.qty ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
      sourceMaterialId: item.sourceMaterialId ?? '',
      sourceWorkTypeId: item.sourceWorkTypeId ?? '',
      snapshotMaterialName: item.snapshotMaterialName ?? '',
      snapshotMaterialCode: item.snapshotMaterialCode ?? '',
      snapshotUnitCode: item.snapshotUnitCode ?? '',
      snapshotUnitName: item.snapshotUnitName ?? '',
      snapshotPurchasePriceRub: item.snapshotPurchasePriceRub ?? null,
      snapshotDensityKgM3: item.snapshotDensityKgM3 ?? null,
      snapshotHeightMm: item.snapshotHeightMm ?? null,
      snapshotLengthMm: item.snapshotLengthMm ?? null,
      snapshotWidthMm: item.snapshotWidthMm ?? null,
      snapshotDiameterMm: item.snapshotDiameterMm ?? null,
      snapshotThicknessMm: item.snapshotThicknessMm ?? null,
      snapshotCharacteristicName: item.snapshotCharacteristicName ?? '',
      snapshotWorkTypeName: item.snapshotWorkTypeName ?? '',
      snapshotWorkShortLabel: item.snapshotWorkShortLabel ?? '',
      snapshotHourlyRateRub: item.snapshotHourlyRateRub ?? null,
      workTimeHours: item.workTimeHours ?? null,
    });
    this.productionDetailsForm.disable({ emitEvent: false });
    this.isProductionDetailsViewMode.set(true);
    this.isProductionDetailsModalOpen.set(true);
  }

  duplicateProductionDetail(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.productionDetailsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isProductionDetailsViewMode.set(false);
    this.productionDetailsForm.enable({ emitEvent: false });
    this.productionDetailsStore.startCreate();
    this.productionDetailsForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      code: item.code ?? '',
      qty: item.qty ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
      sourceMaterialId: '',
      sourceWorkTypeId: '',
      snapshotMaterialName: item.snapshotMaterialName ?? '',
      snapshotMaterialCode: item.snapshotMaterialCode ?? '',
      snapshotUnitCode: item.snapshotUnitCode ?? '',
      snapshotUnitName: item.snapshotUnitName ?? '',
      snapshotPurchasePriceRub: item.snapshotPurchasePriceRub ?? null,
      snapshotDensityKgM3: item.snapshotDensityKgM3 ?? null,
      snapshotHeightMm: item.snapshotHeightMm ?? null,
      snapshotLengthMm: item.snapshotLengthMm ?? null,
      snapshotWidthMm: item.snapshotWidthMm ?? null,
      snapshotDiameterMm: item.snapshotDiameterMm ?? null,
      snapshotThicknessMm: item.snapshotThicknessMm ?? null,
      snapshotCharacteristicName: item.snapshotCharacteristicName ?? '',
      snapshotWorkTypeName: item.snapshotWorkTypeName ?? '',
      snapshotWorkShortLabel: item.snapshotWorkShortLabel ?? '',
      snapshotHourlyRateRub: item.snapshotHourlyRateRub ?? null,
      workTimeHours: item.workTimeHours ?? null,
    });
    this.isProductionDetailsModalOpen.set(true);
  }

  deleteProductionDetail(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.productionDetailsStore.delete(id);
  }

  submitProductionDetails(): void {
    const payload = this.buildProductionDetailsPayload();
    if (this.productionDetailsForm.invalid) {
      this.productionDetailsStore.submit({ value: payload, isValid: false });
      this.productionDetailsForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('production-details-form', this.doc);
      return;
    }
    this.productionDetailsStore.submit({ value: payload, isValid: true });
    this.closeProductionDetailsModal();
    this.finishStandaloneDictionaryCreateIfMatch('productionDetails');
  }

  productionDetailTotalsPreview(): ReturnType<typeof computeProductionDetailTotals> {
    const c = this.productionDetailsForm.getRawValue();
    return computeProductionDetailTotals({
      qty: c.qty ?? 1,
      snapshotPurchasePriceRub: c.snapshotPurchasePriceRub,
      snapshotUnitCode: c.snapshotUnitCode,
      snapshotUnitName: c.snapshotUnitName,
      snapshotDensityKgM3: c.snapshotDensityKgM3,
      snapshotHeightMm: c.snapshotHeightMm,
      snapshotLengthMm: c.snapshotLengthMm,
      snapshotWidthMm: c.snapshotWidthMm,
      snapshotDiameterMm: c.snapshotDiameterMm,
      snapshotThicknessMm: c.snapshotThicknessMm,
      snapshotHourlyRateRub: c.snapshotHourlyRateRub,
      workTimeHours: c.workTimeHours,
    });
  }

  onProductionDetailMaterialPresetChange(materialId: string): void {
    if (!materialId) {
      this.productionDetailsForm.patchValue({ sourceMaterialId: '' });
      return;
    }
    const m = this.materialsStore.items().find((x) => x.id === materialId);
    if (!m) return;
    const ch = this.materialCharacteristicsStore.items().find((x) => x.id === m.materialCharacteristicId);
    const g = this.geometriesStore.items().find((x) => x.id === m.geometryId);
    const u = this.unitsStore.items().find((x) => x.id === m.unitId);
    this.productionDetailsForm.patchValue({
      sourceMaterialId: materialId,
      snapshotMaterialName: m.name,
      snapshotMaterialCode: m.code ?? '',
      snapshotUnitCode: u?.code ?? '',
      snapshotUnitName: u ? `${u.name}` : m.unitName ?? '',
      snapshotPurchasePriceRub: m.purchasePriceRub ?? null,
      snapshotDensityKgM3: ch?.densityKgM3 ?? null,
      snapshotHeightMm: g?.heightMm ?? null,
      snapshotLengthMm: g?.lengthMm ?? null,
      snapshotWidthMm: g?.widthMm ?? null,
      snapshotDiameterMm: g?.diameterMm ?? null,
      snapshotThicknessMm: g?.thicknessMm ?? null,
      snapshotCharacteristicName: ch?.name ?? '',
    });
  }

  onProductionDetailWorkTypePresetChange(workTypeId: string): void {
    if (!workTypeId) {
      this.productionDetailsForm.patchValue({ sourceWorkTypeId: '' });
      return;
    }
    const w = this.productionWorkTypesStore.items().find((x) => x.id === workTypeId);
    if (!w) return;
    this.productionDetailsForm.patchValue({
      sourceWorkTypeId: workTypeId,
      snapshotWorkTypeName: w.name,
      snapshotWorkShortLabel: w.shortLabel,
      snapshotHourlyRateRub: w.hourlyRateRub,
    });
  }

  private buildProductionDetailsPayload() {
    const c = this.productionDetailsForm.controls;
    return productionDetailsPayloadFromValues({
      name: c.name.value,
      code: c.code.value,
      qty: c.qty.value,
      notes: c.notes.value,
      isActive: c.isActive.value,
      sourceMaterialId: c.sourceMaterialId.value,
      sourceWorkTypeId: c.sourceWorkTypeId.value,
      snapshotMaterialName: c.snapshotMaterialName.value,
      snapshotMaterialCode: c.snapshotMaterialCode.value,
      snapshotUnitCode: c.snapshotUnitCode.value,
      snapshotUnitName: c.snapshotUnitName.value,
      snapshotPurchasePriceRub: c.snapshotPurchasePriceRub.value,
      snapshotDensityKgM3: c.snapshotDensityKgM3.value,
      snapshotHeightMm: c.snapshotHeightMm.value,
      snapshotLengthMm: c.snapshotLengthMm.value,
      snapshotWidthMm: c.snapshotWidthMm.value,
      snapshotDiameterMm: c.snapshotDiameterMm.value,
      snapshotThicknessMm: c.snapshotThicknessMm.value,
      snapshotCharacteristicName: c.snapshotCharacteristicName.value,
      snapshotWorkTypeName: c.snapshotWorkTypeName.value,
      snapshotWorkShortLabel: c.snapshotWorkShortLabel.value,
      snapshotHourlyRateRub: c.snapshotHourlyRateRub.value,
      workTimeHours: c.workTimeHours.value,
    });
  }

  private resetMaterialsCreateForm(): void {
    this.isMaterialsViewMode.set(false);
    this.materialsForm.enable({ emitEvent: false });
    this.materialsStore.startCreate();
    this.materialsForm.reset({
      name: '',
      code: '',
      materialCharacteristicId: '',
      geometryId: '',
      unitId: '',
      supplierOrganizationId: '',
      purchasePriceRub: 0,
      notes: '',
      isActive: true,
    });
  }

  /** Инициализация формы на полноэкранном маршруте (без модалки). */
  private initNewMaterialStandaloneForm(): void {
    if (!this.permissions.crud().canCreate) return;
    const pendingMcId = this.materialStandaloneFlow.consumePendingMaterialCharacteristicId();
    this.resetMaterialsCreateForm();
    if (pendingMcId) {
      this.materialsForm.controls.materialCharacteristicId.setValue(pendingMcId);
    }
  }

  navigateToNewMaterialPage(): void {
    if (!this.permissions.crud().canCreate) return;
    void this.router.navigate(['/справочники', 'новый-материал']);
  }

  navigateToNewMaterialCharacteristicPage(): void {
    if (!this.permissions.crud().canCreate) return;
    if (this.isNewMaterialPageRoute()) {
      this.materialStandaloneFlow.markChainFromMaterialStandalone();
    }
    void this.router.navigate(['/справочники', 'новая-характеристика-материала']);
  }

  /**
   * Флаги «quick-add» из модалок материала/характеристики — сбрасываем при выходе с полноэкранных маршрутов,
   * чтобы не залипали после «Назад» без сохранения (бэклог #11).
   */
  private resetAllDictionaryHubQuickAddFlags(): void {
    this.unitQuickAddForMaterials.set(false);
    this.colorQuickAddForMaterialCharacteristics.set(false);
    this.geometriesModalStackAboveMaterials.set(false);
    this.coatingQuickAddForMaterialCharacteristics.set(false);
    this.surfaceQuickAddForMaterialCharacteristics.set(false);
    this.organizationQuickAddForMaterials.set(false);
    this.materialQuickAddForProductionDetails.set(false);
  }

  /**
   * С формы материала/характеристики (в т.ч. полноэкранной) могли открыться модалки справочников поверх —
   * перед закрытием основной формы закрываем их, иначе остаётся «открытый» слой и quick-add.
   */
  private closeDictionaryModalsStackedOverMaterialForm(): void {
    if (this.isWorkTypesModalOpen()) this.closeWorkTypesModal();
    if (this.isUnitsModalOpen()) this.closeUnitsModal();
    if (this.isGeometriesModalOpen()) this.closeGeometriesModal();
    if (this.isColorsModalOpen()) this.closeColorsModal();
    if (this.isSurfaceFinishesModalOpen()) this.closeSurfaceFinishesModal();
    if (this.isCoatingsModalOpen()) this.closeCoatingsModal();
    if (this.isMaterialCharacteristicsModalOpen()) this.closeMaterialCharacteristicsModal();
  }

  /** Назад: один шаг по истории браузера (после standalone-формы). */
  navigateBackFromNewMaterialPage(): void {
    this.closeDictionaryModalsStackedOverMaterialForm();
    this.closeMaterialBundleModal();
    this.resetAllDictionaryHubQuickAddFlags();
    this.location.back();
  }

  navigateBackFromNewMaterialCharacteristicPage(): void {
    this.materialStandaloneFlow.cancelFlow();
    this.closeDictionaryModalsStackedOverMaterialForm();
    this.closeMaterialBundleModal();
    this.resetAllDictionaryHubQuickAddFlags();
    this.location.back();
  }

  navigateToStandaloneDictionaryCreate(key: StandaloneDictionaryCreateKey): void {
    if (!this.permissions.crud().canCreate) return;
    const row = STANDALONE_DICTIONARY_CREATE.find((x) => x.key === key);
    if (!row) return;
    void this.router.navigate(['/справочники', row.path]);
  }

  navigateBackFromStandaloneDictionaryCreate(): void {
    callStandaloneCloseForKey(this.standaloneCreateKey(), {
      workTypes: () => this.closeWorkTypesModal(),
      units: () => this.closeUnitsModal(),
      geometries: () => this.closeGeometriesModal(),
      colors: () => this.closeColorsModal(),
      surfaceFinishes: () => this.closeSurfaceFinishesModal(),
      coatings: () => this.closeCoatingsModal(),
      organizations: () => this.closeOrganizationsModal(),
      clients: () => this.closeClientsModal(),
      roles: () => this.closeRolesModal(),
      users: () => this.closeUsersModal(),
      kpPhotos: () => this.closeKpPhotosModal(),
      productionDetails: () => this.closeProductionDetailsModal(),
    });
    this.resetAllDictionaryHubQuickAddFlags();
    this.location.back();
  }

  onDismissMaterialsForm(): void {
    if (this.isNewMaterialPageRoute()) {
      this.navigateBackFromNewMaterialPage();
    } else {
      this.closeMaterialsModal();
    }
  }

  onDismissMaterialCharacteristicsForm(): void {
    if (this.isNewMaterialCharacteristicPageRoute()) {
      this.navigateBackFromNewMaterialCharacteristicPage();
    } else {
      this.closeMaterialCharacteristicsModal();
    }
  }

  openMaterialsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.resetMaterialsCreateForm();
    this.isMaterialsModalOpen.set(true);
  }

  /** «+» у пресета материала в форме детали: модалка материала поверх детали. */
  openMaterialsCreateFromProductionDetails(): void {
    if (!this.isProductionDetailsModalOpen()) return;
    if (!this.permissions.crud().canCreate) return;
    this.materialQuickAddForProductionDetails.set(true);
    this.openMaterialsCreate();
  }

  navigateToStandaloneWorkTypesFromProductionDetails(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('workTypes');
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
      supplierOrganizationId: item.supplierOrganizationId ?? '',
      purchasePriceRub: item.purchasePriceRub ?? 0,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.isMaterialsModalOpen.set(true);
  }

  private closeMaterialBundleModal(): void {
    this.materialsStore.resetForm();
    this.isMaterialsViewMode.set(false);
    this.materialsViewHeadline.set('');
    this.isMaterialsModalOpen.set(false);
    this.materialCharacteristicsStore.resetForm();
    this.isMaterialCharacteristicsViewMode.set(false);
    this.isMaterialCharacteristicsModalOpen.set(false);
  }

  closeMaterialsModal(): void {
    this.materialQuickAddForProductionDetails.set(false);
    if (this.isNewMaterialCharacteristicPageRoute() && !this.isMaterialCharacteristicsModalOpen()) {
      this.materialsStore.resetForm();
      this.isMaterialsViewMode.set(false);
      this.materialsViewHeadline.set('');
      this.isMaterialsModalOpen.set(false);
      return;
    }
    this.materialsStore.resetForm();
    this.isMaterialsViewMode.set(false);
    this.materialsViewHeadline.set('');
    this.isMaterialsModalOpen.set(false);
  }

  submitMaterials(): void {
    const payload = this.buildMaterialsPayload();
    if (this.materialsForm.invalid) {
      this.materialsStore.submit({ value: payload, isValid: false });
      this.materialsForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('materials-form', this.doc);
      return;
    }
    const quickPd =
      this.materialQuickAddForProductionDetails() &&
      !this.isNewMaterialPageRoute() &&
      !this.isNewMaterialCharacteristicPageRoute();
    this.materialsStore.submit({ value: payload, isValid: true });
    if (this.isNewMaterialPageRoute()) {
      this.scheduleAfterStandaloneMaterialCreate(payload);
      return;
    }
    if (this.isNewMaterialCharacteristicPageRoute()) {
      this.materialsStore.resetForm();
      this.isMaterialsViewMode.set(false);
      this.isMaterialsModalOpen.set(false);
      return;
    }
    if (quickPd) {
      this.scheduleMaterialQuickAddForProductionAfterSubmit(payload);
    }
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
      supplierOrganizationId: item.supplierOrganizationId ?? '',
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
    this.materialsViewHeadline.set(item.name?.trim() || '');
    this.materialsForm.reset({
      name: item.name ?? '',
      code: item.code ?? '',
      materialCharacteristicId: item.materialCharacteristicId ?? '',
      geometryId: item.geometryId ?? '',
      unitId: item.unitId ?? '',
      supplierOrganizationId: item.supplierOrganizationId ?? '',
      purchasePriceRub: item.purchasePriceRub ?? 0,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.materialsForm.disable({ emitEvent: false });
    this.isMaterialsViewMode.set(true);
    this.isMaterialsModalOpen.set(true);
  }

  private resetMaterialCharacteristicsCreateForm(): void {
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
  }

  private initNewMaterialCharacteristicStandaloneForm(): void {
    if (!this.permissions.crud().canCreate) return;
    this.resetMaterialCharacteristicsCreateForm();
  }

  private initWorkTypesStandaloneCreate(): void {
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
  }

  private initUnitsStandaloneCreate(): void {
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
    this.unitQuickAddForMaterials.set(false);
  }

  private initGeometriesStandaloneCreate(): void {
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
    this.geometriesModalStackAboveMaterials.set(false);
  }

  private initColorsStandaloneCreate(): void {
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
    this.colorQuickAddForMaterialCharacteristics.set(false);
  }

  private initSurfaceFinishesStandaloneCreate(): void {
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
    this.surfaceQuickAddForMaterialCharacteristics.set(false);
  }

  private initCoatingsStandaloneCreate(): void {
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
    this.coatingQuickAddForMaterialCharacteristics.set(false);
  }

  private initOrganizationsStandaloneCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isOrganizationsViewMode.set(false);
    this.organizationsForm.enable({ emitEvent: false });
    this.organizationsStore.startCreate();
    this.organizationsForm.reset({
      organizationKind: 'OOO',
      name: '',
      shortName: '',
      inn: '',
      kpp: '',
      ogrn: '',
      okpo: '',
      phone: '',
      email: '',
      website: '',
      legalAddress: '',
      postalAddress: '',
      bankName: '',
      bankBik: '',
      bankAccount: '',
      bankCorrAccount: '',
      signerName: '',
      signerPosition: '',
      notes: '',
      contactIds: [],
      contactPicker: '',
      isActive: true,
    });
  }

  private initClientsStandaloneCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.clientsMarkupOnCreate = null;
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
      passportSeries: '',
      passportNumber: '',
      passportIssuedBy: '',
      passportIssuedDate: '',
      isActive: true,
    });
  }

  private initRolesStandaloneCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.closeRolesModal();
    this.rolesFormDomId.set('roles-form--standalone');
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(null);
    this.rolesForm.enable({ emitEvent: false });
    this.rolesSubmitAttempted.set(false);
    this.rolesForm.reset({
      name: '',
      sortOrder: nextRoleSortOrder(this.rolesStore.items()),
      notes: '',
      isActive: true,
    });
    this.clearFormInteractionState(this.rolesForm);
  }

  private initUsersStandaloneCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isUsersViewMode.set(false);
    this.usersEditingId.set(null);
    this.usersSubmitAttempted.set(false);
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
    this.clearFormInteractionState(this.usersForm);
  }

  private initKpPhotosStandaloneCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.isKpPhotosViewMode.set(false);
    this.kpPhotosForm.enable({ emitEvent: false });
    this.kpPhotosStore.startCreate();
    this.kpPhotosForm.reset({
      name: '',
      organizationId: '',
      photoTitle: '',
      photoUrl: '',
      isActive: true,
    });
  }

  private initProductionDetailsStandaloneCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.resetProductionDetailsCreateForm();
  }

  private initStandaloneDictionaryCreateFromRoute(): void {
    const sc = this.route.snapshot.data['standaloneCreate'];
    if (!isStandaloneDictionaryCreateKey(sc)) {
      return;
    }
    const inits: Record<StandaloneDictionaryCreateKey, () => void> = {
      workTypes: () => this.initWorkTypesStandaloneCreate(),
      units: () => this.initUnitsStandaloneCreate(),
      geometries: () => this.initGeometriesStandaloneCreate(),
      colors: () => this.initColorsStandaloneCreate(),
      surfaceFinishes: () => this.initSurfaceFinishesStandaloneCreate(),
      coatings: () => this.initCoatingsStandaloneCreate(),
      organizations: () => this.initOrganizationsStandaloneCreate(),
      clients: () => this.initClientsStandaloneCreate(),
      roles: () => this.initRolesStandaloneCreate(),
      users: () => this.initUsersStandaloneCreate(),
      kpPhotos: () => this.initKpPhotosStandaloneCreate(),
      productionDetails: () => this.initProductionDetailsStandaloneCreate(),
    };
    inits[sc]();
  }

  openMaterialCharacteristicsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.resetMaterialCharacteristicsCreateForm();
    this.isMaterialCharacteristicsModalOpen.set(true);
  }

  /** «+» у поля геометрии: открыть создание геометрии поверх модалки материала (не плитку хаба под модалкой). */
  openGeometriesCreateFromMaterials(): void {
    if (!this.isMaterialsModalOpen() && !this.isNewMaterialPageRoute()) return;
    if (!this.permissions.crud().canCreate) return;
    this.geometriesModalStackAboveMaterials.set(true);
    this.openGeometriesCreate();
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
      scrollToFirstInvalidControlInForm('material-characteristics-form', this.doc);
      return;
    }
    const standaloneCharSubmit =
      this.isNewMaterialCharacteristicPageRoute() && !this.isMaterialCharacteristicsModalOpen();
    this.materialCharacteristicsStore.submit({ value: payload, isValid: true });
    if (standaloneCharSubmit) {
      this.scheduleAfterStandaloneCharacteristicCreate(payload);
      return;
    }
    this.closeMaterialCharacteristicsModal();
  }

  /** Ключ совпадения только что созданной записи в списке (после `getItems` в store). */
  private materialCharacteristicQuickAddMatchKey(
    x: MaterialCharacteristicItem | MaterialCharacteristicItemInput,
  ): string {
    return [
      x.name.trim().toLowerCase(),
      (x.code ?? '').trim().toLowerCase(),
      String(x.densityKgM3 ?? ''),
      x.colorId ?? '',
      x.surfaceFinishId ?? '',
      x.coatingId ?? '',
    ].join('|');
  }

  private materialItemSnapshotKeyFromPayload(p: MaterialItemInput): string {
    return [
      p.name.trim().toLowerCase(),
      (p.code ?? '').trim().toLowerCase(),
      p.materialCharacteristicId ?? '',
      p.geometryId ?? '',
      String(p.purchasePriceRub ?? ''),
      String(p.isActive),
    ].join('|');
  }

  private materialItemMatchesSnapshot(m: MaterialItem, key: string): boolean {
    return (
      this.materialItemSnapshotKeyFromPayload({
        name: m.name,
        code: m.code,
        materialCharacteristicId: m.materialCharacteristicId,
        geometryId: m.geometryId,
        purchasePriceRub: m.purchasePriceRub,
        isActive: m.isActive,
      }) === key
    );
  }

  /** После create материала store обновляется асинхронно — ждём строку, затем шаг назад. */
  private scheduleAfterStandaloneMaterialCreate(payload: MaterialItemInput): void {
    const snapshotKey = this.materialItemSnapshotKeyFromPayload(payload);
    let attempts = 0;
    const maxAttempts = 40;
    const tick = (): void => {
      const created = this.materialsStore.items().find((m) => this.materialItemMatchesSnapshot(m, snapshotKey));
      if (created) {
        this.closeMaterialBundleModal();
        this.location.back();
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tick, 50);
      } else {
        this.closeMaterialBundleModal();
        this.location.back();
      }
    };
    queueMicrotask(tick);
  }

  /** После создания материала из формы «Деталь» — подставить пресет по новому id. */
  private scheduleMaterialQuickAddForProductionAfterSubmit(payload: MaterialItemInput): void {
    const snapshotKey = this.materialItemSnapshotKeyFromPayload(payload);
    let attempts = 0;
    const maxAttempts = 40;
    const tick = (): void => {
      const created = this.materialsStore.items().find((m) => this.materialItemMatchesSnapshot(m, snapshotKey));
      if (created) {
        this.onProductionDetailMaterialPresetChange(created.id);
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tick, 50);
      }
    };
    queueMicrotask(tick);
  }

  /** После создания организации из «+» у поставщика в материале — подставить id поставщика. */
  private scheduleOrganizationQuickAddForMaterialsAfterSubmit(orgMatchKey: string): void {
    let attempts = 0;
    const maxAttempts = 40;
    const tick = (): void => {
      const created = this.organizationsStore.items().find(
        (o) =>
          `${(o.inn ?? '').trim().toLowerCase()}|${(o.name ?? '').trim().toLowerCase()}` === orgMatchKey,
      );
      if (created) {
        this.materialsForm.controls.supplierOrganizationId.setValue(created.id);
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tick, 50);
      }
    };
    queueMicrotask(tick);
  }

  /**
   * После create характеристики: опционально подставить id в форму материала (если пришли с «Новый материал»),
   * затем шаг назад по истории.
   */
  private scheduleAfterStandaloneCharacteristicCreate(payload: MaterialCharacteristicItemInput): void {
    const snapshotKey = this.materialCharacteristicQuickAddMatchKey(payload);
    let attempts = 0;
    const maxAttempts = 40;
    const tick = (): void => {
      const created = this.materialCharacteristicsStore.items().find(
        (x) => this.materialCharacteristicQuickAddMatchKey(x) === snapshotKey,
      );
      if (created) {
        this.materialStandaloneFlow.afterStandaloneCharacteristicSaved(created.id);
        this.materialCharacteristicsStore.resetForm();
        this.isMaterialCharacteristicsViewMode.set(false);
        this.closeMaterialBundleModal();
        this.location.back();
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tick, 50);
      } else {
        this.materialStandaloneFlow.cancelFlow();
        this.closeMaterialBundleModal();
        this.location.back();
      }
    };
    queueMicrotask(tick);
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
    if (this.geometriesModalStackAboveMaterials()) {
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
      return;
    }
    this.navigateToStandaloneDictionaryCreate('geometries');
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
    this.geometriesModalStackAboveMaterials.set(false);
  }

  submitGeometries(): void {
    const payload = this.buildGeometriesPayload();
    if (this.geometriesForm.invalid) {
      this.geometriesStore.submit({ value: payload, isValid: false });
      this.geometriesForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('geometries-form', this.doc);
      return;
    }
    const quickAddForMaterials = this.geometriesModalStackAboveMaterials();
    const snapshotKey = this.geometryQuickAddMatchKey(payload);
    this.geometriesStore.submit({ value: payload, isValid: true });
    if (quickAddForMaterials) {
      this.scheduleGeometryQuickAddToMaterials(snapshotKey);
    }
    this.closeGeometriesModal();
    this.finishStandaloneDictionaryCreateIfMatch('geometries');
  }

  /** Как у единиц измерения: после создания геометрии из формы материала — подставить id в поле. */
  private geometryQuickAddMatchKey(x: {
    name: string;
    shapeKey: string;
    heightMm?: number;
    lengthMm?: number;
    widthMm?: number;
    diameterMm?: number;
    thicknessMm?: number;
  }): string {
    return [
      x.name.trim().toLowerCase(),
      x.shapeKey,
      String(x.heightMm ?? ''),
      String(x.lengthMm ?? ''),
      String(x.widthMm ?? ''),
      String(x.diameterMm ?? ''),
      String(x.thicknessMm ?? ''),
    ].join('|');
  }

  /** Store обновляет список асинхронно после create — повторяем поиск, как для unitQuickAdd. */
  private scheduleGeometryQuickAddToMaterials(snapshotKey: string): void {
    let attempts = 0;
    const maxAttempts = 24;
    const tick = (): void => {
      const created = this.geometriesStore.items().find(
        (x) => this.geometryQuickAddMatchKey(x) === snapshotKey,
      );
      if (created) {
        this.materialsForm.controls.geometryId.setValue(created.id);
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tick, 50);
      }
    };
    queueMicrotask(tick);
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
    if (fromMaterials) {
      this.isUnitsViewMode.set(false);
      this.unitsForm.enable({ emitEvent: false });
      this.unitsStore.startCreate();
      this.unitsForm.reset({
        name: '',
        code: '',
        notes: '',
        isActive: true,
      });
      this.unitQuickAddForMaterials.set(true);
      this.isUnitsModalOpen.set(true);
      return;
    }
    this.navigateToStandaloneDictionaryCreate('units');
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
      scrollToFirstInvalidControlInForm('units-form', this.doc);
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
    this.finishStandaloneDictionaryCreateIfMatch('units');
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

  openKpPhotosCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('kpPhotos');
  }

  openKpPhotosEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isKpPhotosViewMode.set(false);
    this.kpPhotosForm.enable({ emitEvent: false });
    const item = this.kpPhotosStore.items().find((x) => x.id === id);
    if (!item) return;
    this.kpPhotosStore.startEdit(item.id);
    this.kpPhotosForm.reset({
      name: item.name ?? '',
      organizationId: item.organizationId ?? '',
      photoTitle: item.photoTitle ?? '',
      photoUrl: item.photoUrl ?? '',
      isActive: item.isActive,
    });
    this.isKpPhotosModalOpen.set(true);
  }

  closeKpPhotosModal(): void {
    this.kpPhotosStore.resetForm();
    this.isKpPhotosViewMode.set(false);
    this.isKpPhotosModalOpen.set(false);
  }

  submitKpPhotos(): void {
    const payload = this.buildKpPhotosPayload();
    if (this.kpPhotosForm.invalid) {
      this.kpPhotosStore.submit({ value: payload, isValid: false });
      this.kpPhotosForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('kp-photos-form', this.doc);
      return;
    }
    this.kpPhotosStore.submit({ value: payload, isValid: true });
    this.closeKpPhotosModal();
    this.finishStandaloneDictionaryCreateIfMatch('kpPhotos');
  }

  deleteKpPhoto(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.kpPhotosStore.delete(id);
  }

  duplicateKpPhoto(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.kpPhotosStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isKpPhotosViewMode.set(false);
    this.kpPhotosForm.enable({ emitEvent: false });
    this.kpPhotosStore.startCreate();
    this.kpPhotosForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      organizationId: item.organizationId ?? '',
      photoTitle: item.photoTitle ?? '',
      photoUrl: item.photoUrl ?? '',
      isActive: item.isActive,
    });
    this.isKpPhotosModalOpen.set(true);
  }

  openKpPhotosView(id: string): void {
    const item = this.kpPhotosStore.items().find((x) => x.id === id);
    if (!item) return;
    this.kpPhotosStore.resetForm();
    this.kpPhotosForm.reset({
      name: item.name ?? '',
      organizationId: item.organizationId ?? '',
      photoTitle: item.photoTitle ?? '',
      photoUrl: item.photoUrl ?? '',
      isActive: item.isActive,
    });
    this.kpPhotosForm.disable({ emitEvent: false });
    this.isKpPhotosViewMode.set(true);
    this.isKpPhotosModalOpen.set(true);
  }

  /** Подпись организации в просмотре записи «Фото для КП». */
  kpPhotoOrganizationLabel(): string {
    const id = this.kpPhotosForm.controls.organizationId.value?.trim() ?? '';
    if (!id) return '—';
    return this.organizationsStore.options().find((o) => o.id === id)?.label ?? '—';
  }

  onKpPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    const maxBytes = 1.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      window.alert('Файл слишком большой. Максимум 1,5 МБ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      this.kpPhotosForm.controls.photoUrl.setValue(url);
      this.kpPhotosForm.controls.photoUrl.markAsDirty();
    };
    reader.readAsDataURL(file);
  }

  openRolesCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('roles');
  }

  openRolesEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    const item = this.rolesStore.roleById(id);
    if (!item) return;
    this.rolesFormDomId.set('roles-form--modal');
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(id);
    this.rolesSubmitAttempted.set(false);
    this.rolesForm.enable({ emitEvent: false });
    this.rolesForm.reset({
      name: item.name ?? '',
      sortOrder: item.sortOrder ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.clearFormInteractionState(this.rolesForm);
    this.isRolesModalOpen.set(true);
  }

  openRolesView(id: string): void {
    const item = this.rolesStore.roleById(id);
    if (!item) return;
    this.rolesEditingId.set(null);
    this.rolesSubmitAttempted.set(false);
    this.rolesForm.reset({
      name: item.name ?? '',
      sortOrder: item.sortOrder ?? 1,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.clearFormInteractionState(this.rolesForm);
    this.rolesForm.disable({ emitEvent: false });
    this.isRolesViewMode.set(true);
    this.isRolesModalOpen.set(true);
  }

  closeRolesModal(): void {
    this.rolesForm.enable({ emitEvent: false });
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(null);
    this.rolesSubmitAttempted.set(false);
    this.isRolesModalOpen.set(false);
    this.rolesFormDomId.set('roles-form--modal');
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
      const taken = new Set<string>([
        ...SEEDED_ROLE_CODES_LOWER,
        ...this.rolesStore.items().map((x) => x.code.trim().toLowerCase()),
      ]);
      const base = slugifyRoleCodeFromName(name);
      code = allocateUniqueRoleCode(base, taken);
    }
    return {
      code,
      name,
      sortOrder: safeSort,
      notes: v.notes.trim() || undefined,
      isActive: v.isActive,
      isSystem:
        editId != null
          ? (this.rolesStore.roleById(editId)?.isSystem ?? false)
          : false,
    };
  }

  submitRoles(): void {
    if (this.rolesSubmitInFlight) {
      return;
    }
    if (this.rolesForm.invalid) {
      this.rolesSubmitAttempted.set(true);
      this.rolesForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm(this.rolesFormDomId(), this.doc);
      return;
    }
    const payload = this.buildRolesPayload();
    const editId = this.rolesEditingId();
    this.rolesSubmitInFlight = true;
    const op$ = editId ? this.rolesStore.update(editId, payload) : this.rolesStore.create(payload);
    this.sub.add(
      op$.pipe(finalize(() => (this.rolesSubmitInFlight = false))).subscribe({
        next: () => {
          this.closeRolesModal();
          this.finishStandaloneDictionaryCreateIfMatchCreateOnly('roles', editId);
        },
      }),
    );
  }

  deleteRole(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    const item = this.rolesStore.roleById(id);
    if (!item || item.isSystem) return;
    this.sub.add(
      this.rolesStore.remove(id).subscribe({
        next: () => {
          if (this.permissions.role() === id) {
            this.permissions.setRole(ROLE_ID_SYSTEM_ADMIN);
          }
        },
      }),
    );
  }

  duplicateRole(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.rolesStore.roleById(id);
    if (!item || item.isSystem) return;
    this.rolesFormDomId.set('roles-form--modal');
    this.isRolesViewMode.set(false);
    this.rolesEditingId.set(null);
    this.rolesSubmitAttempted.set(false);
    this.rolesForm.enable({ emitEvent: false });
    this.rolesForm.reset({
      name: item.name ? `${item.name} (копия)` : '',
      sortOrder: nextRoleSortOrder(this.rolesStore.items()),
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    this.clearFormInteractionState(this.rolesForm);
    this.isRolesModalOpen.set(true);
  }

  openUsersCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('users');
  }

  openUsersEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    const item = this.usersStore.userById(id);
    if (!item) return;
    this.isUsersViewMode.set(false);
    this.usersEditingId.set(id);
    this.usersSubmitAttempted.set(false);
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
    this.clearFormInteractionState(this.usersForm);
    this.isUsersModalOpen.set(true);
  }

  openUsersView(id: string): void {
    const item = this.usersStore.userById(id);
    if (!item) return;
    this.usersEditingId.set(null);
    this.usersSubmitAttempted.set(false);
    this.usersForm.reset({
      login: item.login,
      password: '',
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      roleId: item.roleId,
    });
    this.clearFormInteractionState(this.usersForm);
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
    this.usersSubmitAttempted.set(false);
    this.isUsersModalOpen.set(false);
  }

  submitUsers(): void {
    if (this.usersForm.invalid) {
      this.usersSubmitAttempted.set(true);
      this.usersForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('users-form', this.doc);
      return;
    }
    const v = this.usersForm.getRawValue();
    const editId = this.usersEditingId();
    const logins = this.usersStore
      .items()
      .filter((x) => x.id !== editId)
      .map((x) => x.login.trim().toLowerCase());
    if (logins.includes(v.login.trim().toLowerCase())) {
      this.usersSubmitAttempted.set(true);
      this.usersForm.controls.login.setErrors({ duplicate: true });
      this.usersForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('users-form', this.doc);
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
    this.finishStandaloneDictionaryCreateIfMatchCreateOnly('users', editId);
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
    this.usersSubmitAttempted.set(false);
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
    this.clearFormInteractionState(this.usersForm);
    this.isUsersModalOpen.set(true);
  }

  private clearFormInteractionState(form: FormGroup): void {
    form.markAsPristine();
    form.markAsUntouched();
    Object.values(form.controls).forEach((control) => {
      control.markAsPristine();
      control.markAsUntouched();
    });
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
    if (fromMaterialCharacteristics) {
      this.isColorsViewMode.set(false);
      this.colorsEditingId.set(null);
      this.colorsForm.enable({ emitEvent: false });
      this.colorsStore.startCreate();
      this.colorsForm.reset({
        ralCode: 'RAL ',
        name: '',
        hex: '#000000',
      });
      this.colorQuickAddForMaterialCharacteristics.set(true);
      this.isColorsModalOpen.set(true);
      return;
    }
    this.navigateToStandaloneDictionaryCreate('colors');
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
      scrollToFirstInvalidControlInForm('colors-form', this.doc);
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
    this.finishStandaloneDictionaryCreateIfMatch('colors');
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
    if (fromMaterialCharacteristics) {
      this.isSurfaceFinishesViewMode.set(false);
      this.surfaceFinishesEditingId.set(null);
      this.surfaceFinishesForm.enable({ emitEvent: false });
      this.surfaceFinishesStore.startCreate();
      this.surfaceFinishesForm.reset({
        finishType: '',
        roughnessClass: '',
        raMicron: null,
      });
      this.surfaceQuickAddForMaterialCharacteristics.set(true);
      this.isSurfaceFinishesModalOpen.set(true);
      return;
    }
    this.navigateToStandaloneDictionaryCreate('surfaceFinishes');
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
      scrollToFirstInvalidControlInForm('surface-finishes-form', this.doc);
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
    this.finishStandaloneDictionaryCreateIfMatch('surfaceFinishes');
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
    if (fromMaterialCharacteristics) {
      this.isCoatingsViewMode.set(false);
      this.coatingsEditingId.set(null);
      this.coatingsForm.enable({ emitEvent: false });
      this.coatingsStore.startCreate();
      this.coatingsForm.reset({
        coatingType: '',
        coatingSpec: '',
        thicknessMicron: null,
      });
      this.coatingQuickAddForMaterialCharacteristics.set(true);
      this.isCoatingsModalOpen.set(true);
      return;
    }
    this.navigateToStandaloneDictionaryCreate('coatings');
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
      scrollToFirstInvalidControlInForm('coatings-form', this.doc);
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
      this.finishStandaloneDictionaryCreateIfMatch('coatings');
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
    this.finishStandaloneDictionaryCreateIfMatch('coatings');
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
    this.navigateToStandaloneDictionaryCreate('clients');
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
      passportSeries: item.passportSeries ?? '',
      passportNumber: item.passportNumber ?? '',
      passportIssuedBy: item.passportIssuedBy ?? '',
      passportIssuedDate: item.passportIssuedDate ?? '',
      isActive: item.isActive,
    });
    this.isClientsModalOpen.set(true);
  }

  closeClientsModal(): void {
    this.clientsMarkupOnCreate = null;
    this.clientsStore.resetForm();
    this.isClientsViewMode.set(false);
    this.isClientsModalOpen.set(false);
  }

  submitClients(): void {
    const payload = this.buildClientPayload();
    if (this.clientsForm.invalid) {
      this.clientsStore.submit({ value: payload, isValid: false });
      this.clientsForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('clients-form', this.doc);
      return;
    }
    this.clientsStore.submit({ value: payload, isValid: true });
    this.closeClientsModal();
    this.finishStandaloneDictionaryCreateIfMatch('clients');
  }

  deleteClient(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.clientsStore.delete(id);
  }

  duplicateClient(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.clientsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.clientsMarkupOnCreate = item.clientMarkupPercent ?? null;
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

  openOrganizationsCreate(): void {
    if (!this.permissions.crud().canCreate) return;
    this.navigateToStandaloneDictionaryCreate('organizations');
  }

  /** «+» у поставщика в форме материала: модалка организации поверх материала. */
  openOrganizationsCreateFromMaterials(): void {
    if (!this.isMaterialsModalOpen() && !this.isNewMaterialPageRoute()) return;
    if (!this.permissions.crud().canCreate) return;
    this.organizationQuickAddForMaterials.set(true);
    this.isOrganizationsViewMode.set(false);
    this.organizationsForm.enable({ emitEvent: false });
    this.organizationsStore.startCreate();
    this.organizationsForm.reset({
      organizationKind: 'OOO',
      name: '',
      shortName: '',
      inn: '',
      kpp: '',
      ogrn: '',
      okpo: '',
      phone: '',
      email: '',
      website: '',
      legalAddress: '',
      postalAddress: '',
      bankName: '',
      bankBik: '',
      bankAccount: '',
      bankCorrAccount: '',
      signerName: '',
      signerPosition: '',
      notes: '',
      contactIds: [],
      contactPicker: '',
      isActive: true,
    });
    this.isOrganizationsModalOpen.set(true);
  }

  openOrganizationsEdit(id: string): void {
    if (!this.permissions.crud().canEdit) return;
    this.isOrganizationsViewMode.set(false);
    this.organizationsForm.enable({ emitEvent: false });
    const item = this.organizationsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.organizationsStore.startEdit(item.id);
    this.organizationsForm.reset({
      organizationKind: mapLegalFormToOrganizationKind(item.legalForm),
      name: item.name ?? '',
      shortName: item.shortName ?? '',
      inn: item.inn ?? '',
      kpp: item.kpp ?? '',
      ogrn: item.ogrn ?? '',
      okpo: item.okpo ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      website: item.website ?? '',
      legalAddress: item.legalAddress ?? '',
      postalAddress: item.postalAddress ?? '',
      bankName: item.bankName ?? '',
      bankBik: item.bankBik ?? '',
      bankAccount: item.bankAccount ?? '',
      bankCorrAccount: item.bankCorrAccount ?? '',
      signerName: item.signerName ?? '',
      signerPosition: item.signerPosition ?? '',
      notes: item.notes ?? '',
      contactIds: item.contactIds ?? [],
      contactPicker: '',
      isActive: item.isActive,
    });
    this.isOrganizationsModalOpen.set(true);
  }

  closeOrganizationsModal(): void {
    this.organizationQuickAddForMaterials.set(false);
    this.organizationsStore.resetForm();
    this.isOrganizationsViewMode.set(false);
    this.isOrganizationsModalOpen.set(false);
  }

  submitOrganizations(): void {
    const payload = this.buildOrganizationsPayload();
    if (this.organizationsForm.invalid) {
      this.organizationsStore.submit({ value: payload, isValid: false });
      this.organizationsForm.markAllAsTouched();
      scrollToFirstInvalidControlInForm('organizations-form', this.doc);
      return;
    }
    const quickOrg =
      this.organizationQuickAddForMaterials() &&
      !this.organizationsStore.isEditMode();
    const orgMatchKey = quickOrg
      ? `${(payload.inn ?? '').trim().toLowerCase()}|${payload.name.trim().toLowerCase()}`
      : '';
    this.organizationsStore.submit({ value: payload, isValid: true });
    if (quickOrg && orgMatchKey) {
      this.scheduleOrganizationQuickAddForMaterialsAfterSubmit(orgMatchKey);
    }
    this.closeOrganizationsModal();
    this.finishStandaloneDictionaryCreateIfMatch('organizations');
  }

  deleteOrganization(id: string): void {
    if (!this.permissions.crud().canDelete) return;
    this.organizationsStore.delete(id);
  }

  duplicateOrganization(id: string): void {
    if (!this.permissions.can('crud.duplicate')) return;
    const item = this.organizationsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.isOrganizationsViewMode.set(false);
    this.organizationsForm.enable({ emitEvent: false });
    this.organizationsStore.startCreate();
    this.organizationsForm.reset({
      organizationKind: mapLegalFormToOrganizationKind(item.legalForm),
      name: `${item.name} (копия)`,
      shortName: item.shortName ?? '',
      inn: item.inn ?? '',
      kpp: item.kpp ?? '',
      ogrn: item.ogrn ?? '',
      okpo: item.okpo ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      website: item.website ?? '',
      legalAddress: item.legalAddress ?? '',
      postalAddress: item.postalAddress ?? '',
      bankName: item.bankName ?? '',
      bankBik: item.bankBik ?? '',
      bankAccount: item.bankAccount ?? '',
      bankCorrAccount: item.bankCorrAccount ?? '',
      signerName: item.signerName ?? '',
      signerPosition: item.signerPosition ?? '',
      notes: item.notes ?? '',
      contactIds: item.contactIds ?? [],
      contactPicker: '',
      isActive: item.isActive,
    });
    this.isOrganizationsModalOpen.set(true);
  }

  openOrganizationsView(id: string): void {
    const item = this.organizationsStore.items().find((x) => x.id === id);
    if (!item) return;
    this.organizationsStore.resetForm();
    this.organizationsForm.reset({
      organizationKind: mapLegalFormToOrganizationKind(item.legalForm),
      name: item.name ?? '',
      shortName: item.shortName ?? '',
      inn: item.inn ?? '',
      kpp: item.kpp ?? '',
      ogrn: item.ogrn ?? '',
      okpo: item.okpo ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      website: item.website ?? '',
      legalAddress: item.legalAddress ?? '',
      postalAddress: item.postalAddress ?? '',
      bankName: item.bankName ?? '',
      bankBik: item.bankBik ?? '',
      bankAccount: item.bankAccount ?? '',
      bankCorrAccount: item.bankCorrAccount ?? '',
      signerName: item.signerName ?? '',
      signerPosition: item.signerPosition ?? '',
      notes: item.notes ?? '',
      contactIds: item.contactIds ?? [],
      contactPicker: '',
      isActive: item.isActive,
    });
    this.organizationsForm.disable({ emitEvent: false });
    this.isOrganizationsViewMode.set(true);
    this.isOrganizationsModalOpen.set(true);
  }

  /** Контакты, ещё не добавленные в организацию — для выпадающего списка. */
  organizationContactPickerOptions(): { id: string; label: string }[] {
    const selected = new Set(this.organizationsForm.controls.contactIds.value ?? []);
    return this.organizationContactSelectOptions().filter((o) => !selected.has(o.id));
  }

  organizationContactLabel(contactId: string): string {
    const o = this.organizationContactSelectOptions().find((x) => x.id === contactId);
    return o?.label ?? contactId;
  }

  /** Строка в списке выбранных контактов организации: ФИО, телефон, email из справочника. */
  organizationContactRow(contactId: string): { fio: string; phone: string; email: string } {
    const item = this.clientsStore.items().find((x) => x.id === contactId);
    if (!item) {
      return {
        fio: this.organizationContactLabel(contactId),
        phone: '—',
        email: '—',
      };
    }
    return {
      fio: formatClientFio(item),
      phone: item.phone?.trim() || '—',
      email: item.email?.trim() || '—',
    };
  }

  addOrganizationContactFromPicker(): void {
    const id = this.organizationsForm.controls.contactPicker.value?.trim();
    if (!id) {
      return;
    }
    const cur = this.organizationsForm.controls.contactIds.value ?? [];
    if (cur.includes(id)) {
      this.organizationsForm.controls.contactPicker.setValue('');
      return;
    }
    this.organizationsForm.controls.contactIds.setValue([...cur, id]);
    this.organizationsForm.controls.contactPicker.setValue('');
  }

  removeOrganizationContact(contactId: string): void {
    if (this.isOrganizationsViewMode()) {
      return;
    }
    const cur = this.organizationsForm.controls.contactIds.value ?? [];
    this.organizationsForm.controls.contactIds.setValue(cur.filter((x) => x !== contactId));
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

  materialViewCharacteristicLabel(): string {
    const id = this.materialsForm.controls.materialCharacteristicId.value;
    return this.materialCharacteristicSelectOptions().find((o) => o.id === id)?.label ?? '—';
  }

  materialViewGeometryLabel(): string {
    const id = this.materialsForm.controls.geometryId.value;
    return this.geometrySelectOptions().find((o) => o.id === id)?.label ?? '—';
  }

  materialViewUnitLabel(): string {
    const id = this.materialsForm.controls.unitId.value;
    return this.unitsStore.options().find((o) => o.id === id)?.label ?? '—';
  }

  materialViewSupplierLabel(): string {
    const id = this.materialsForm.controls.supplierOrganizationId.value?.trim() ?? '';
    if (!id) return '—';
    return this.organizationsStore.options().find((o) => o.id === id)?.label ?? '—';
  }

  materialViewUnitShort(): string {
    const id = this.materialsForm.controls.unitId.value;
    const u = this.unitsStore.items().find((x) => x.id === id);
    const c = u?.code?.trim();
    if (c) {
      return c;
    }
    const n = u?.name?.trim();
    return n ? n.slice(0, 12) : 'ед.';
  }

  materialViewPriceFormatted(): string {
    const v = this.materialsForm.controls.purchasePriceRub.value;
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : 0;
    return new Intl.NumberFormat('ru-RU').format(n);
  }

  /** ФИО контакта для презентационной карточки просмотра. */
  clientsPreviewFio(): string {
    return formatClientFio(this.clientsForm.getRawValue());
  }

  clientsPreviewSubtitle(): string {
    const v = this.clientsForm.getRawValue();
    return [v.phone?.trim(), v.email?.trim()].filter(Boolean).join(' · ');
  }

  organizationsPreviewSubtitle(): string {
    const v = this.organizationsForm.getRawValue();
    const parts: string[] = [];
    if (v.shortName?.trim()) {
      parts.push(v.shortName.trim());
    }
    if (v.inn?.trim()) {
      parts.push('ИНН ' + v.inn.trim());
    }
    return parts.join(' · ');
  }

  geometryShapeLabelForView(): string {
    const key = this.geometriesForm.controls.shapeKey.value;
    return this.shapeOptions.find((s) => s.value === key)?.label ?? '—';
  }

  formatGeometryMmValue(v: number | null): string {
    if (v == null || Number.isNaN(v)) return '—';
    return String(v);
  }

  materialCharacteristicsPreviewSubtitle(): string {
    const d = this.materialCharacteristicsForm.controls.densityKgM3.value;
    if (d != null && !Number.isNaN(d)) {
      return `${d} кг/м³`;
    }
    return '';
  }

  materialCharacteristicsColorOptionLabel(): string {
    const id = this.materialCharacteristicsForm.controls.colorId.value;
    if (!id?.trim()) return '—';
    return this.colorsStore.options().find((o) => o.id === id)?.label ?? '—';
  }

  materialCharacteristicsSurfaceOptionLabel(): string {
    const id = this.materialCharacteristicsForm.controls.surfaceFinishId.value;
    if (!id?.trim()) return '—';
    return this.surfaceFinishesStore.options().find((o) => o.id === id)?.label ?? '—';
  }

  materialCharacteristicsCoatingOptionLabel(): string {
    const id = this.materialCharacteristicsForm.controls.coatingId.value;
    if (!id?.trim()) return '—';
    return this.coatingsStore.options().find((o) => o.id === id)?.label ?? '—';
  }

  usersViewRoleLabel(): string {
    const id = this.usersForm.controls.roleId.value;
    return this.roleSelectOptions().find((o) => o.id === id)?.label ?? '—';
  }

  workTypesPreviewSubtitle(): string {
    const v = this.workTypesForm.getRawValue();
    const parts: string[] = [];
    if (v.shortLabel?.trim()) {
      parts.push(v.shortLabel.trim());
    }
    if (v.hourlyRateRub != null && v.hourlyRateRub > 0) {
      parts.push(`${v.hourlyRateRub} ₽/ч`);
    }
    return parts.join(' · ');
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
    const ralCode = normalizeRalCode(this.colorsForm.controls.ralCode.value) ?? '';
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
    const normalized = normalizeRalCode(raw);

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
      await firstValueFrom(this.rolesStore.createMany(parsed.rows));
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

  async onProductionDetailsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapProductionDetailsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.productionDetailsStore.createMany(parsed.rows);
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

  async onOrganizationsExcelImported(file: File): Promise<void> {
    this.excelImportBegin();
    try {
      const rows = await this.excelRowsFromFile(file);
      const parsed = this.validateAndMapOrganizationsRows(rows);
      if (!parsed.ok) {
        this.excelImportStatus.set(`Импорт отклонен: ${parsed.errors.join(' | ')}`);
        return;
      }
      this.organizationsStore.createMany(parsed.rows);
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
      'ID поставщика': '',
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
      'ID поставщика',
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
      'ID поставщика': item.supplierOrganizationId ?? '',
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

  private productionDetailsExcelHeaders(): string[] {
    return [
      'ID',
      'Название',
      'Код',
      'Кол-во',
      'Заметки',
      'Активен',
      'ID источник материала',
      'ID источник вида работ',
      'Материал название',
      'Материал код',
      'ЕИ код',
      'ЕИ название',
      'Цена закуп ₽',
      'Плотность кг/м³',
      'В мм',
      'Дл мм',
      'Ш мм',
      'Диам мм',
      'Толщ мм',
      'Характеристика',
      'Вид работ',
      'Сокращение работ',
      'Ставка ₽/ч',
      'Часы работ',
      'Итого материал ₽',
      'Итого работа ₽',
      'Итого ₽',
    ];
  }

  async exportProductionDetailsExcel(): Promise<void> {
    const headers = this.productionDetailsExcelHeaders();
    const rows = this.productionDetailsStore.items().map((x) => ({
      ID: x.id,
      Название: x.name,
      Код: x.code ?? '',
      'Кол-во': x.qty,
      Заметки: x.notes ?? '',
      Активен: x.isActive ? 'да' : 'нет',
      'ID источник материала': x.sourceMaterialId ?? '',
      'ID источник вида работ': x.sourceWorkTypeId ?? '',
      'Материал название': x.snapshotMaterialName ?? '',
      'Материал код': x.snapshotMaterialCode ?? '',
      'ЕИ код': x.snapshotUnitCode ?? '',
      'ЕИ название': x.snapshotUnitName ?? '',
      'Цена закуп ₽': x.snapshotPurchasePriceRub ?? '',
      'Плотность кг/м³': x.snapshotDensityKgM3 ?? '',
      'В мм': x.snapshotHeightMm ?? '',
      'Дл мм': x.snapshotLengthMm ?? '',
      'Ш мм': x.snapshotWidthMm ?? '',
      'Диам мм': x.snapshotDiameterMm ?? '',
      'Толщ мм': x.snapshotThicknessMm ?? '',
      Характеристика: x.snapshotCharacteristicName ?? '',
      'Вид работ': x.snapshotWorkTypeName ?? '',
      'Сокращение работ': x.snapshotWorkShortLabel ?? '',
      'Ставка ₽/ч': x.snapshotHourlyRateRub ?? '',
      'Часы работ': x.workTimeHours ?? '',
      'Итого материал ₽': x.materialTotalRub ?? '',
      'Итого работа ₽': x.workTotalRub ?? '',
      'Итого ₽': x.lineTotalRub ?? '',
    }));
    if (await this.exportRowsToExcel('production-details.xlsx', 'ProductionDetails', rows, headers)) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadProductionDetailsTemplateExcel(): Promise<void> {
    const headers = this.productionDetailsExcelHeaders();
    const sample: Record<string, string | number> = {
      ID: '',
      Название: 'Деталь — пример',
      Код: 'DET-001',
      'Кол-во': 1,
      Заметки: '',
      Активен: 'да',
      'ID источник материала': '',
      'ID источник вида работ': '',
      'Материал название': '',
      'Материал код': '',
      'ЕИ код': 'pcs',
      'ЕИ название': 'шт',
      'Цена закуп ₽': 100,
      'Плотность кг/м³': '',
      'В мм': '',
      'Дл мм': 1000,
      'Ш мм': '',
      'Диам мм': '',
      'Толщ мм': '',
      Характеристика: '',
      'Вид работ': '',
      'Сокращение работ': '',
      'Ставка ₽/ч': 1500,
      'Часы работ': 0.5,
      'Итого материал ₽': '',
      'Итого работа ₽': '',
      'Итого ₽': '',
    };
    if (
      await this.exportRowsToExcel(
        'production-details-template.xlsx',
        'ProductionDetails_TEMPLATE',
        [sample],
        headers,
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

  async exportOrganizationsExcel(): Promise<void> {
    const headers = this.organizationsExcelHeaders();
    const rows = this.organizationsStore.items().map((item) => this.buildOrganizationsExcelRow(item));
    if (await this.exportRowsToExcel('organizations.xlsx', 'Organizations', rows, headers)) {
      this.excelImportStatus.set(`Экспортировано: ${rows.length} строк. Файл в папке загрузок.`);
    }
  }

  async downloadOrganizationsTemplateExcel(): Promise<void> {
    const headers = this.organizationsExcelHeaders();
    const sample: Record<string, string | number> = {
      'Вид организации': 'ООО',
      'Полное наименование': 'ООО «Пример Производство»',
      'Короткое наименование': 'ООО «Пример»',
      ИНН: '7701234567',
      КПП: '770101001',
      ОГРН: '1237700001112',
      ОКПО: '12345678',
      Телефон: '+7 495 111-22-33',
      Email: 'office@example.test',
      Сайт: 'https://example.test',
      'Юридический адрес': 'г. Москва, ул. Производственная, д. 10',
      'Почтовый адрес': 'г. Москва, а/я 15',
      Банк: 'ПАО Сбербанк',
      БИК: '044525225',
      'Расчётный счёт': '40702810900000000001',
      'Корр. счёт': '30101810400000000225',
      Подписант: 'Иванов Пётр Сергеевич',
      'Должность подписанта': 'Генеральный директор',
      Заметки: 'Базовая организация для КП',
      Активен: 'да',
    };
    if (
      await this.exportRowsToExcel('organizations-template.xlsx', 'Organizations_TEMPLATE', [sample], headers)
    ) {
      this.excelImportStatus.set('Шаблон Excel скачан. Файл в папке загрузок.');
    }
  }

  private organizationsExcelHeaders(): string[] {
    return [
      'Вид организации',
      'Полное наименование',
      'Короткое наименование',
      'ИНН',
      'КПП',
      'ОГРН',
      'ОКПО',
      'Телефон',
      'Email',
      'Сайт',
      'Юридический адрес',
      'Почтовый адрес',
      'Банк',
      'БИК',
      'Расчётный счёт',
      'Корр. счёт',
      'Подписант',
      'Должность подписанта',
      'Заметки',
      'Активен',
    ];
  }

  private buildOrganizationsExcelRow(item: OrganizationItem): Record<string, string | number> {
    const kind = mapLegalFormToOrganizationKind(item.legalForm);
    return {
      'Вид организации': organizationKindToLegalForm(kind),
      'Полное наименование': item.name,
      'Короткое наименование': item.shortName ?? '',
      ИНН: item.inn ?? '',
      КПП: kind === 'IP' ? '' : (item.kpp ?? ''),
      ОГРН: item.ogrn ?? '',
      ОКПО: item.okpo ?? '',
      Телефон: item.phone ?? '',
      Email: item.email ?? '',
      Сайт: item.website ?? '',
      'Юридический адрес': item.legalAddress ?? '',
      'Почтовый адрес': item.postalAddress ?? '',
      Банк: item.bankName ?? '',
      БИК: item.bankBik ?? '',
      'Расчётный счёт': item.bankAccount ?? '',
      'Корр. счёт': item.bankCorrAccount ?? '',
      Подписант: item.signerName ?? '',
      'Должность подписанта': item.signerPosition ?? '',
      Заметки: item.notes ?? '',
      Активен: item.isActive ? 'да' : 'нет',
    };
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

  isKpPhotosInvalid(controlName: keyof typeof this.kpPhotosForm.controls): boolean {
    const control = this.kpPhotosForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.kpPhotosStore.formSubmitAttempted())
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

  isOrganizationsInvalid(controlName: keyof typeof this.organizationsForm.controls): boolean {
    const control = this.organizationsForm.controls[controlName];
    return (
      control.invalid &&
      (control.touched || control.dirty || this.organizationsStore.formSubmitAttempted())
    );
  }

  /**
   * Пользователи/роли без `formSubmitAttempted` в store: как у контактов по смыслу —
   * подпись ошибки только после blur/ввода либо после `markAllAsTouched()` на неуспешном сабмите.
   */
  isUsersInvalid(controlName: keyof typeof this.usersForm.controls): boolean {
    const control = this.usersForm.controls[controlName];
    return control.invalid && (control.dirty || this.usersSubmitAttempted());
  }

  isRolesInvalid(controlName: keyof typeof this.rolesForm.controls): boolean {
    const control = this.rolesForm.controls[controlName];
    return control.invalid && (control.dirty || this.rolesSubmitAttempted());
  }

  usersLoginErrorText(): string {
    const c = this.usersForm.controls.login;
    if (!this.isUsersInvalid('login')) return '';
    if (c.hasError('required')) return 'Обязательное поле';
    if (c.hasError('minlength')) return 'Минимум 2 символа';
    if (c.hasError('duplicate')) return 'Такой логин уже есть';
    return '';
  }

  usersPasswordErrorText(): string {
    const c = this.usersForm.controls.password;
    if (!this.isUsersInvalid('password')) return '';
    if (c.hasError('required')) return 'Задайте пароль';
    if (c.hasError('minlength')) return 'Минимум 4 символа';
    return '';
  }

  usersFullNameErrorText(): string {
    if (!this.isUsersInvalid('fullName')) return '';
    // Как у контакта: одна формулировка для пустого и короткого значения.
    return 'Минимум 2 символа';
  }

  usersEmailErrorText(): string {
    const c = this.usersForm.controls.email;
    if (!this.isUsersInvalid('email')) return '';
    if (c.hasError('email')) return 'Некорректный email';
    return '';
  }

  usersRoleErrorText(): string {
    const c = this.usersForm.controls.roleId;
    if (!this.isUsersInvalid('roleId')) return '';
    if (c.hasError('required')) return 'Выберите роль';
    return '';
  }

  rolesNameErrorText(): string {
    const c = this.rolesForm.controls.name;
    if (!this.isRolesInvalid('name')) return '';
    if (c.hasError('required')) return 'Обязательное поле';
    if (c.hasError('minlength')) return 'Минимум 2 символа';
    return '';
  }

  rolesSortOrderErrorText(): string {
    const c = this.rolesForm.controls.sortOrder;
    if (!this.isRolesInvalid('sortOrder')) return '';
    if (c.hasError('required')) return 'Укажите число';
    if (c.hasError('min') || c.hasError('max')) return 'Целое от 1 до 999999';
    return '';
  }

  organizationInnPlaceholder(): string {
    return this.organizationsForm.controls.organizationKind.value === 'IP' ? '12 цифр' : '10 цифр';
  }

  organizationOgrnLabel(): string {
    return this.organizationsForm.controls.organizationKind.value === 'IP' ? 'ОГРНИП' : 'ОГРН';
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
    const c = this.materialsForm.controls;
    return materialsPayloadFromValues({
      name: c.name.value,
      code: c.code.value,
      materialCharacteristicId: c.materialCharacteristicId.value,
      geometryId: gid,
      geometryName: g?.name,
      unitId: uid || undefined,
      unitName: u ? `${u.name} (${u.code ?? '—'})` : undefined,
      supplierOrganizationId: c.supplierOrganizationId.value || undefined,
      purchasePriceRub: c.purchasePriceRub.value,
      notes: c.notes.value,
      isActive: c.isActive.value,
    });
  }

  private buildMaterialCharacteristicsPayload(): MaterialCharacteristicItemInput {
    const c = this.materialCharacteristicsForm.controls;
    return materialCharacteristicsPayloadFromValues({
      name: c.name.value,
      code: c.code.value,
      densityKgM3: c.densityKgM3.value,
      colorId: c.colorId.value,
      colorName: c.colorName.value,
      colorHex: c.colorHex.value,
      surfaceFinishId: c.surfaceFinishId.value,
      finishType: c.finishType.value,
      roughnessClass: c.roughnessClass.value,
      raMicron: c.raMicron.value,
      coatingId: c.coatingId.value,
      coatingType: c.coatingType.value,
      coatingSpec: c.coatingSpec.value,
      coatingThicknessMicron: c.coatingThicknessMicron.value,
      notes: c.notes.value,
      isActive: c.isActive.value,
    });
  }

  private buildGeometriesPayload() {
    const c = this.geometriesForm.controls;
    return geometriesPayloadFromValues({
      name: c.name.value,
      shapeKey: c.shapeKey.value,
      heightMm: c.heightMm.value,
      lengthMm: c.lengthMm.value,
      widthMm: c.widthMm.value,
      diameterMm: c.diameterMm.value,
      thicknessMm: c.thicknessMm.value,
      notes: c.notes.value,
      isActive: c.isActive.value,
    });
  }

  private buildUnitsPayload() {
    const c = this.unitsForm.controls;
    return unitsPayloadFromValues({
      name: c.name.value,
      code: c.code.value,
      notes: c.notes.value,
      isActive: c.isActive.value,
    });
  }

  private buildKpPhotosPayload() {
    const c = this.kpPhotosForm.controls;
    return kpPhotosPayloadFromValues({
      name: c.name.value,
      organizationId: c.organizationId.value,
      photoTitle: c.photoTitle.value,
      photoUrl: c.photoUrl.value,
      isActive: c.isActive.value,
    });
  }

  private buildColorsPayload() {
    return colorsPayloadFromFormRaw(this.colorsForm.getRawValue());
  }

  private buildSurfaceFinishPayload() {
    const c = this.surfaceFinishesForm.controls;
    return surfaceFinishPayloadFromValues({
      finishType: c.finishType.value,
      roughnessClass: c.roughnessClass.value,
      raMicron: c.raMicron.value,
    });
  }

  private buildCoatingPayload() {
    const c = this.coatingsForm.controls;
    return coatingPayloadFromValues({
      coatingType: c.coatingType.value,
      coatingSpec: c.coatingSpec.value,
      thicknessMicron: c.thicknessMicron.value,
    });
  }

  private buildClientPayload(): ClientItemInput {
    const editId = this.clientsStore.editId();
    let clientMarkupPercent: number | null = null;
    if (editId) {
      clientMarkupPercent =
        this.clientsStore.items().find((x) => x.id === editId)?.clientMarkupPercent ?? null;
    } else if (this.clientsMarkupOnCreate !== null) {
      clientMarkupPercent = this.clientsMarkupOnCreate;
    }
    const c = this.clientsForm.controls;
    return clientPayloadFromForm(
      {
        lastName: c.lastName.value,
        firstName: c.firstName.value,
        patronymic: c.patronymic.value,
        address: c.address.value,
        phone: c.phone.value,
        email: c.email.value,
        notes: c.notes.value,
        passportSeries: c.passportSeries.value,
        passportNumber: c.passportNumber.value,
        passportIssuedBy: c.passportIssuedBy.value,
        passportIssuedDate: c.passportIssuedDate.value,
        isActive: c.isActive.value,
      },
      clientMarkupPercent,
    );
  }

  private buildOrganizationsPayload(): OrganizationItemInput {
    const selectedContactIds = (this.organizationsForm.controls.contactIds.value ?? [])
      .map((x) => String(x))
      .filter(Boolean);
    const labelsMap = new Map(this.organizationContactSelectOptions().map((x) => [x.id, x.label]));
    const c = this.organizationsForm.controls;
    return organizationsPayloadFromFields({
      organizationKind: c.organizationKind.value,
      selectedContactIds,
      contactLabelsById: labelsMap,
      name: c.name.value,
      shortName: c.shortName.value,
      inn: c.inn.value,
      kpp: c.kpp.value,
      ogrn: c.ogrn.value,
      okpo: c.okpo.value,
      phone: c.phone.value,
      email: c.email.value,
      website: c.website.value,
      legalAddress: c.legalAddress.value,
      postalAddress: c.postalAddress.value,
      bankName: c.bankName.value,
      bankBik: c.bankBik.value,
      bankAccount: c.bankAccount.value,
      bankCorrAccount: c.bankCorrAccount.value,
      signerName: c.signerName.value,
      signerPosition: c.signerPosition.value,
      notes: c.notes.value,
      isActive: c.isActive.value,
    });
  }

  private validateAndMapColorRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ ralCode?: string; name: string; hex: string; rgb: { r: number; g: number; b: number } }>;
    errors: string[];
  } {
    return validateAndMapColorRowsFn.call(this, rows);
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
    return validateAndMapMaterialsRowsFn.call(this, rows);
  }

  private validateAndMapMaterialCharacteristicsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    drafts: MaterialCharacteristicsImportDraftRow[];
    errors: string[];
  } {
    return validateAndMapMaterialCharacteristicsRowsFn.call(this, rows);
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
      const v = parseNumberOrNull(cleaned);
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
    return validateAndMapGeometriesRowsFn.call(this, rows);
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
    return validateAndMapWorkTypesRowsFn.call(this, rows);
  }

  private isUuidString(raw: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw.trim(),
    );
  }

  private validateAndMapProductionDetailsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: ProductionDetailItemInput[];
    errors: string[];
  } {
    return validateAndMapProductionDetailsRowsFn.call(this, rows);
  }

  private validateAndMapUnitsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ name: string; code: string; notes?: string; isActive: boolean }>;
    errors: string[];
  } {
    return validateAndMapUnitsRowsFn.call(this, rows);
  }

  private validateAndMapRolesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: RoleItemInput[];
    errors: string[];
  } {
    return validateAndMapRolesRowsFn.call(this, rows);
  }

  private validateAndMapUsersRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: UserItemInput[];
    errors: string[];
  } {
    return validateAndMapUsersRowsFn.call(this, rows);
  }

  private validateAndMapSurfaceFinishesRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ finishType: string; roughnessClass: string; raMicron?: number }>;
    errors: string[];
  } {
    return validateAndMapSurfaceFinishesRowsFn.call(this, rows);
  }

  private validateAndMapCoatingsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: Array<{ coatingType: string; coatingSpec: string; thicknessMicron?: number }>;
    errors: string[];
  } {
    return validateAndMapCoatingsRowsFn.call(this, rows);
  }

  private validateAndMapClientsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: ClientItemInput[];
    errors: string[];
  } {
    return validateAndMapClientsRowsFn.call(this, rows);
  }

  private validateAndMapOrganizationsRows(rows: ReadonlyArray<Record<string, unknown>>): {
    ok: boolean;
    rows: OrganizationItemInput[];
    errors: string[];
  } {
    return validateAndMapOrganizationsRowsFn.call(this, rows);
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





