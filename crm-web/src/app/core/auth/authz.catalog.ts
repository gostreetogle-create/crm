import { DICTIONARY_HUB_PERMISSION_KEYS } from './dict-hub-permissions';
import { PermissionKey } from './authz.types';

/**
 * Человекочитаемые подписи и группы для UI, документации и будущего API ролей.
 * При добавлении ключа в `PermissionKey` — обязательно строка здесь (проверит тип).
 */
export const PERMISSION_CATALOG: Record<
  PermissionKey,
  { labelRu: string; group: 'page' | 'dict' | 'crud' | 'excel' }
> = {
  'page.dictionaries': { labelRu: 'Раздел «Справочники»', group: 'page' },
  'page.demo': { labelRu: 'Раздел «Demo»', group: 'page' },
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
  'crud.create': { labelRu: 'Создание записей', group: 'crud' },
  'crud.edit': { labelRu: 'Редактирование записей', group: 'crud' },
  'crud.delete': { labelRu: 'Удаление записей', group: 'crud' },
  'crud.duplicate': { labelRu: 'Дублирование записей', group: 'crud' },
  'excel.template': { labelRu: 'Excel: шаблон', group: 'excel' },
  'excel.import': { labelRu: 'Excel: импорт', group: 'excel' },
  'excel.export': { labelRu: 'Excel: экспорт', group: 'excel' },
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
  'excel.template',
  'excel.import',
  'excel.export',
];

/** Секции матрицы в UI «Админ-настройки». */
export const AUTHZ_MATRIX_UI_SECTIONS: ReadonlyArray<{
  group: 'page' | 'dict' | 'crud' | 'excel';
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
    group: 'excel',
    titleRu: 'Excel',
    hintRu: 'Шаблон, импорт и экспорт в панели плитки.',
  },
];

export function permissionKeysForAuthzGroup(
  group: 'page' | 'dict' | 'crud' | 'excel',
): readonly PermissionKey[] {
  return PERMISSION_KEYS_ORDERED.filter((k) => PERMISSION_CATALOG[k].group === group);
}
