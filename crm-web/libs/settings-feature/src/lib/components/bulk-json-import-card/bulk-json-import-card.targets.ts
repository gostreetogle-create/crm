import type { PermissionKey } from '@srm/authz-core';

/** Идентификатор в реестре (slug); не только enum — таблиц много. */
export type BulkJsonTargetId = string;

const WORKFLOW =
  'Сценарий: «Скачать JSON» (снимок из БД) → правка в файле на диске → «Загрузить JSON» → «Проверить» → «Сохранить в БД».';

export interface BulkJsonTarget {
  id: BulkJsonTargetId;
  label: string;
  methodLine: string;
  detailHint: string;
  /** Имя файла при скачивании снимка или пустого шаблона. */
  downloadFileName: string;
  hasEndpoint: boolean;
  submitPermission: PermissionKey | null;
  /** Сегмент пути `POST /api/bulk/:segment` (kebab-case); пустая строка — endpoint ещё не подключён. */
  apiSegment: string;
}

/** Пустой шаблон для сброса буфера импорта в памяти. */
export const EMPTY_BULK_JSON = '{\n  "items": []\n}';

/**
 * Полный список таблиц. Цели с hasEndpoint: true — рабочие POST на бэкенде; остальные — до появления API.
 */
export const BULK_JSON_TARGETS: readonly BulkJsonTarget[] = [
  {
    id: 'units',
    label: 'Единицы измерения',
    methodLine: 'POST /api/bulk/units',
    detailHint: `${WORKFLOW} Поля: name (обязательно), code, notes, isActive (по умолчанию true). Право: admin.bulk.units.`,
    downloadFileName: 'bulk-units-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.units',
    apiSegment: 'units',
  },
  {
    id: 'colors',
    label: 'Цвета RAL',
    methodLine: 'POST /api/bulk/colors',
    detailHint: `${WORKFLOW} Поля: name, hex, rgbR, rgbG, rgbB, ralCode (опционально). Право: admin.bulk.colors.`,
    downloadFileName: 'bulk-colors-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.colors',
    apiSegment: 'colors',
  },
  {
    id: 'surface_finishes',
    label: 'Поверхности / шероховатость',
    methodLine: 'POST /api/bulk/surface-finishes',
    detailHint: `${WORKFLOW} Поля: finishType, roughnessClass, raMicron (опционально). Право: admin.bulk.surface_finishes.`,
    downloadFileName: 'bulk-surface-finishes-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.surface_finishes',
    apiSegment: 'surface-finishes',
  },
  {
    id: 'coatings',
    label: 'Покрытия',
    methodLine: 'POST /api/bulk/coatings',
    detailHint: `${WORKFLOW} Поля: coatingType, coatingSpec, thicknessMicron (опционально). Право: admin.bulk.coatings.`,
    downloadFileName: 'bulk-coatings-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.coatings',
    apiSegment: 'coatings',
  },
  {
    id: 'geometries',
    label: 'Геометрии',
    methodLine: 'POST /api/bulk/geometries',
    detailHint: `${WORKFLOW} Поля: name, shapeKey, размеры в мм (опционально), notes, isActive. Право: admin.bulk.geometries.`,
    downloadFileName: 'bulk-geometries-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.geometries',
    apiSegment: 'geometries',
  },
  {
    id: 'material_characteristics',
    label: 'Характеристики материалов',
    methodLine: 'POST /api/bulk/material-characteristics',
    detailHint: `${WORKFLOW} Минимум name; опционально ссылки uuid на цвет / отделку / покрытие. Право: admin.bulk.material_characteristics.`,
    downloadFileName: 'bulk-material-characteristics-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.material_characteristics',
    apiSegment: 'material-characteristics',
  },
  {
    id: 'materials',
    label: 'Материалы',
    methodLine: 'POST /api/bulk/materials',
    detailHint: `${WORKFLOW} Обязательны materialCharacteristicId и geometryId (uuid). Право: admin.bulk.materials.`,
    downloadFileName: 'bulk-materials-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.materials',
    apiSegment: 'materials',
  },
  {
    id: 'production_work_types',
    label: 'Виды работ',
    methodLine: 'POST /api/bulk/production-work-types',
    detailHint: `${WORKFLOW} Поля: name, shortLabel, hourlyRateRub (≥ 1), isActive. Право: admin.bulk.production_work_types.`,
    downloadFileName: 'bulk-production-work-types-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.production_work_types',
    apiSegment: 'production-work-types',
  },
  {
    id: 'production_details',
    label: 'Детали производства',
    methodLine: 'POST /api/bulk/production-details',
    detailHint: `${WORKFLOW} Обязательно name; опционально id, code, qty, снимки материала/работы и расчётные поля. Право: admin.bulk.production_details.`,
    downloadFileName: 'bulk-production-details-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.production_details',
    apiSegment: 'production-details',
  },
  {
    id: 'clients',
    label: 'Клиенты',
    methodLine: 'POST /api/bulk/clients',
    detailHint: `${WORKFLOW} Обязательны lastName, firstName, patronymic, phone, address, email; паспорт и прочее — как в справочнике. Право: admin.bulk.clients.`,
    downloadFileName: 'bulk-clients-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.clients',
    apiSegment: 'clients',
  },
  {
    id: 'organizations',
    label: 'Организации',
    methodLine: 'POST /api/bulk/organizations',
    detailHint: `${WORKFLOW} Обязательно name; реквизиты и контакты — опционально. Право: admin.bulk.organizations.`,
    downloadFileName: 'bulk-organizations-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.organizations',
    apiSegment: 'organizations',
  },
  {
    id: 'kp_photos',
    label: 'Фото для КП',
    methodLine: 'POST /api/bulk/kp-photos',
    detailHint: `${WORKFLOW} Обязательны name, organizationId (uuid), photoTitle; photoFileName / photoUrl — опционально. Право: admin.bulk.kp_photos.`,
    downloadFileName: 'bulk-kp-photos-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.kp_photos',
    apiSegment: 'kp-photos',
  },
  {
    id: 'roles',
    label: 'Роли',
    methodLine: 'POST /api/bulk/roles',
    detailHint: `${WORKFLOW} Поля: code, name, sortOrder; опционально id (uuid), notes, isActive. Новые строки не могут быть системными (isSystem через JSON игнорируется при создании). Системную роль можно только смягчённо обновить (имя, порядок, заметки, активность). Право: admin.bulk.roles. «Удалить данные» оставляет одну якорную роль (системную или первую по sortOrder), остальных пользователей переводит на неё.`,
    downloadFileName: 'bulk-roles-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.roles',
    apiSegment: 'roles',
  },
  {
    id: 'users',
    label: 'Пользователи',
    methodLine: 'POST /api/bulk/users — планируется',
    detailHint: 'Эндпоинт в разработке. Пароли и хеш — отдельный контракт.',
    downloadFileName: 'bulk-users-data.json',
    hasEndpoint: false,
    submitPermission: null,
    apiSegment: '',
  },
  {
    id: 'products',
    label: 'Изделия (производственные)',
    methodLine: 'POST /api/bulk/products — планируется',
    detailHint: 'Эндпоинт в разработке. Модель ManufacturedProduct: code, name, description, priceRub.',
    downloadFileName: 'bulk-products-data.json',
    hasEndpoint: false,
    submitPermission: null,
    apiSegment: '',
  },
  {
    id: 'trade_goods',
    label: 'Товары',
    methodLine: 'POST /api/bulk/trade-goods',
    detailHint: `${WORKFLOW} Шапка: code, name, description, priceRub, costRub (опц.), notes, isActive. Обязательно lines: [{ productId (uuid изделия) ИЛИ productCode (код изделия), qty? }], минимум одна строка. Фото карточки — в JSON не входят; положите файл на сервер в TRADE_GOODS_PHOTOS_DIR с именем как артикул. Право: admin.bulk.trade_goods.`,
    downloadFileName: 'bulk-trade-goods-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.trade_goods',
    apiSegment: 'trade-goods',
  },
  {
    id: 'complexes',
    label: 'Каталог: комплексы',
    methodLine: 'POST /api/bulk/complexes',
    detailHint: `${WORKFLOW} Обязательно name; code, description — опционально. Право: admin.bulk.complexes.`,
    downloadFileName: 'bulk-complexes-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.complexes',
    apiSegment: 'complexes',
  },
  {
    id: 'catalog_products',
    label: 'Каталог: товары в комплексе',
    methodLine: 'POST /api/bulk/catalog-products',
    detailHint: `${WORKFLOW} Обязательны complexId (uuid комплекса), name, price (≥ 0); не путать с производственным изделием (ManufacturedProduct). Право: admin.bulk.catalog_products.`,
    downloadFileName: 'bulk-catalog-products-data.json',
    hasEndpoint: true,
    submitPermission: 'admin.bulk.catalog_products',
    apiSegment: 'catalog-products',
  },
];

export function bulkJsonTargetById(id: BulkJsonTargetId): BulkJsonTarget {
  const t = BULK_JSON_TARGETS.find((x) => x.id === id);
  if (t) return t;
  const fallback = BULK_JSON_TARGETS[0];
  if (!fallback) {
    throw new Error('bulkJsonTargetById: empty BULK_JSON_TARGETS');
  }
  return fallback;
}
