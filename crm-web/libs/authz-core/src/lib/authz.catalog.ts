import { DICTIONARY_HUB_PERMISSION_KEYS } from './dict-hub-permissions';
import { PermissionKey } from './authz.types';

/**
 * Человекочитаемые подписи и группы для UI, документации и будущего API ролей.
 * При добавлении ключа в `PermissionKey` — обязательно строка здесь (проверит тип).
 */
export const PERMISSION_CATALOG: Record<
  PermissionKey,
  { labelRu: string; group: 'page' | 'dict' | 'crud' | 'bulk' }
> = {
  'page.dictionaries': { labelRu: 'Раздел «Справочники»', group: 'page' },
  'page.demo': { labelRu: 'Раздел «Demo»', group: 'page' },
  'page.commercialProposal': { labelRu: 'Раздел «Коммерческое предложение»', group: 'page' },
  'page.production': { labelRu: 'Раздел «Производство»', group: 'page' },
  'page.preferences': { labelRu: 'Раздел «Настройки»', group: 'page' },
  'page.admin.settings': { labelRu: 'Раздел «Админ-настройки»', group: 'page' },
  'dict.hub.materials': { labelRu: 'Плитка «Материалы»', group: 'dict' },
  'dict.hub.material_characteristics': { labelRu: 'Плитка «Характеристики материала»', group: 'dict' },
  'dict.hub.work_types': { labelRu: 'Плитка «Вид работ»', group: 'dict' },
  'dict.hub.units': { labelRu: 'Плитка «Единицы измерения»', group: 'dict' },
  'dict.hub.clients': { labelRu: 'Плитка «Контактные лица»', group: 'dict' },
  'dict.hub.organizations': { labelRu: 'Плитка «Организации»', group: 'dict' },
  'dict.hub.colors': { labelRu: 'Плитка «Цвета (RAL)»', group: 'dict' },
  'dict.hub.surface_finishes': { labelRu: 'Плитка «Тип отделки»', group: 'dict' },
  'dict.hub.geometries': { labelRu: 'Плитка «Форма и габариты»', group: 'dict' },
  'dict.hub.coatings': { labelRu: 'Плитка «Покрытие»', group: 'dict' },
  'dict.hub.roles': { labelRu: 'Плитка «Роли»', group: 'dict' },
  'dict.hub.users': { labelRu: 'Плитка «Пользователи»', group: 'dict' },
  'dict.hub.kp_photos': { labelRu: 'Плитка «Фото для КП»', group: 'dict' },
  'dict.hub.production_details': { labelRu: 'Плитка «Детали»', group: 'dict' },
  'dict.hub.products': { labelRu: 'Плитка «Изделия»', group: 'dict' },
  'dict.hub.trade_goods': { labelRu: 'Плитка «Товары»', group: 'dict' },
  'dict.hub.catalog_suite': { labelRu: 'Плитка «Комплексы и каталог»', group: 'dict' },
  'crud.create': { labelRu: 'Создание записей', group: 'crud' },
  'crud.edit': { labelRu: 'Редактирование записей', group: 'crud' },
  'crud.delete': { labelRu: 'Удаление записей', group: 'crud' },
  'crud.duplicate': { labelRu: 'Дублирование записей', group: 'crud' },
  'admin.bulk.all': {
    labelRu: 'JSON: массовый ввод — все подключённые таблицы',
    group: 'bulk',
  },
  'admin.bulk.units': {
    labelRu: 'JSON: массовое создание единиц измерения',
    group: 'bulk',
  },
  'admin.bulk.colors': {
    labelRu: 'JSON: массовое создание цветов RAL',
    group: 'bulk',
  },
  'admin.bulk.surface_finishes': {
    labelRu: 'JSON: массовое создание типов отделки / шероховатости',
    group: 'bulk',
  },
  'admin.bulk.coatings': {
    labelRu: 'JSON: массовое создание покрытий',
    group: 'bulk',
  },
  'admin.bulk.geometries': {
    labelRu: 'JSON: массовое создание геометрий',
    group: 'bulk',
  },
  'admin.bulk.material_characteristics': {
    labelRu: 'JSON: массовое создание характеристик материалов',
    group: 'bulk',
  },
  'admin.bulk.materials': {
    labelRu: 'JSON: массовое создание материалов',
    group: 'bulk',
  },
  'admin.bulk.production_work_types': {
    labelRu: 'JSON: массовое создание видов работ',
    group: 'bulk',
  },
  'admin.bulk.clients': {
    labelRu: 'JSON: массовое создание клиентов',
    group: 'bulk',
  },
  'admin.bulk.organizations': {
    labelRu: 'JSON: массовое создание организаций',
    group: 'bulk',
  },
  'admin.bulk.kp_photos': {
    labelRu: 'JSON: массовое создание фото для КП',
    group: 'bulk',
  },
  'admin.bulk.users': {
    labelRu: 'JSON: массовое создание пользователей',
    group: 'bulk',
  },
  'admin.bulk.production_details': {
    labelRu: 'JSON: массовое создание деталей производства',
    group: 'bulk',
  },
  'admin.bulk.manufactured_products': {
    labelRu: 'JSON: массовое создание изделий (производство)',
    group: 'bulk',
  },
  'admin.bulk.complexes': {
    labelRu: 'JSON: массовое создание каталожных комплексов',
    group: 'bulk',
  },
  'admin.bulk.catalog_products': {
    labelRu: 'JSON: массовое создание товаров в комплексе (каталог)',
    group: 'bulk',
  },
  'admin.bulk.roles': {
    labelRu: 'JSON: массовое создание ролей',
    group: 'bulk',
  },
  'admin.bulk.trade_goods': {
    labelRu: 'JSON: массовое создание товаров',
    group: 'bulk',
  },
};

/** Порядок ключей в матрице (синхрон с `PermissionKey`). */
export const PERMISSION_KEYS_ORDERED: readonly PermissionKey[] = [
  'page.dictionaries',
  'page.demo',
  'page.preferences',
  'page.admin.settings',
  ...DICTIONARY_HUB_PERMISSION_KEYS,
  'crud.create',
  'crud.edit',
  'crud.delete',
  'crud.duplicate',
  'admin.bulk.all',
  'admin.bulk.units',
  'admin.bulk.colors',
  'admin.bulk.surface_finishes',
  'admin.bulk.coatings',
  'admin.bulk.geometries',
  'admin.bulk.material_characteristics',
  'admin.bulk.materials',
  'admin.bulk.production_work_types',
  'admin.bulk.clients',
  'admin.bulk.organizations',
  'admin.bulk.kp_photos',
  'admin.bulk.users',
  'admin.bulk.production_details',
  'admin.bulk.manufactured_products',
  'admin.bulk.complexes',
  'admin.bulk.catalog_products',
  'admin.bulk.roles',
  'admin.bulk.trade_goods',
];

/** Секции матрицы в UI «Админ-настройки». */
export const AUTHZ_MATRIX_UI_SECTIONS: ReadonlyArray<{
  group: 'page' | 'dict' | 'crud' | 'bulk';
  titleRu: string;
  hintRu: string;
}> = [
  {
    group: 'page',
    titleRu: 'Разделы и страницы',
    hintRu: 'Доступ к маршрутам и пунктам меню.',
  },
  {
    group: 'dict',
    titleRu: 'Справочники на хабе',
    hintRu: 'Какие плитки видны на странице «Справочники».',
  },
  {
    group: 'crud',
    titleRu: 'Кнопки в карточках',
    hintRu: 'Действия со строками внутри справочников.',
  },
  {
    group: 'bulk',
    titleRu: 'Массовый ввод (JSON)',
    hintRu: 'Админ API: пакетное создание записей (несколько справочников; см. список прав).',
  },
];

export function permissionKeysForAuthzGroup(
  group: 'page' | 'dict' | 'crud' | 'bulk',
): readonly PermissionKey[] {
  return PERMISSION_KEYS_ORDERED.filter((k) => PERMISSION_CATALOG[k].group === group);
}
