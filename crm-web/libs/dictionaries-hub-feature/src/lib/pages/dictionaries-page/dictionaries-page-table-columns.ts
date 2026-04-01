/**
 * Колонки CrudLayout для плиток хаба: превью (узкий hubLine) и полный набор при раскрытии/выборе на доске.
 * Вынесено из `dictionaries-page.ts` для снижения размера монолита (бэклог #1).
 */
import type { TableColumn } from '@srm/ui-kit';

/** На хабе одна колонка hubLine; короткий заголовок колонки по смыслу справочника (см. naming convention). */
export const WORK_TYPES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Вид работ' }];

/** Full-view для раскрытия: показываем все значимые поля строки. */
export const WORK_TYPES_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'shortLabel', label: 'Коротко' },
  { key: 'hourlyRateLabel', label: 'Ставка ₽/ч' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const MATERIAL_CHARACTERISTICS_COLUMNS_PREVIEW: TableColumn[] = [
  { key: 'hubLine', label: 'Характеристика' },
];

export const MATERIAL_CHARACTERISTICS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'code', label: 'Код' },
  { key: 'densityKgM3', label: 'Плотность' },
  { key: 'color', label: 'Цвет', swatchHexKey: 'colorHex' },
  { key: 'finish', label: 'Отделка' },
  { key: 'coating', label: 'Покрытие' },
  { key: 'notes', label: 'Заметка' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const MATERIALS_COLUMNS_PREVIEW: TableColumn[] = [{ key: 'hubLine', label: 'Материал' }];

/** Широкая плитка материалов: все основные поля строкой таблицы (не одна склейка hubLine). */
export const MATERIALS_COLUMNS_FULL: TableColumn[] = [
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

export const GEOMETRIES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Профиль' }];

/** Full-view для раскрытия geometries. */
export const GEOMETRIES_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'shape', label: 'Форма' },
  { key: 'params', label: 'Параметры' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const UNITS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Ед. изм.' }];

/** Full-view для раскрытия units. */
export const UNITS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'code', label: 'Код' },
  { key: 'notes', label: 'Заметка' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const KP_PHOTOS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Фото для КП' }];

export const KP_PHOTOS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Наименование' },
  { key: 'organizationName', label: 'Организация' },
  { key: 'photoTitle', label: 'Название фото' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const COLORS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Цвет', swatchHexKey: 'hex' }];

/** Full-view для раскрытия colors. */
export const COLORS_COLUMNS_FULL: TableColumn[] = [
  { key: 'ralCode', label: 'Код RAL' },
  { key: 'name', label: 'Название' },
  { key: 'hex', label: 'HEX', swatchHexKey: 'hex' },
  { key: 'rgb', label: 'RGB' },
];

export const SURFACE_FINISHES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Отделка' }];

/** Full-view для раскрытия surface finishes. */
export const SURFACE_FINISHES_COLUMNS_FULL: TableColumn[] = [
  { key: 'finishType', label: 'Отделка' },
  { key: 'roughnessClass', label: 'Шероховатость' },
  { key: 'raMicron', label: 'Ra, мкм' },
];

export const COATINGS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Покрытие' }];

/** Full-view для раскрытия coatings. */
export const COATINGS_COLUMNS_FULL: TableColumn[] = [
  { key: 'coatingType', label: 'Тип покрытия' },
  { key: 'coatingSpec', label: 'Спецификация' },
  { key: 'thicknessMicron', label: 'Толщ., мкм' },
];

export const CLIENTS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'ФИО' }];

/** Full-view для раскрытия clients. */
export const CLIENTS_COLUMNS_FULL: TableColumn[] = [
  { key: 'fio', label: 'ФИО' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Телефон' },
  { key: 'isActive', label: 'Активен' },
];

export const ORGANIZATIONS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Организация' }];

export const ORGANIZATIONS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'inn', label: 'ИНН' },
  { key: 'legalForm', label: 'Вид' },
  { key: 'contacts', label: 'Контакты' },
  { key: 'isActive', label: 'Активна' },
];

/** Как у остальных узких плиток хаба: одна колонка превью, раскрытие — полная таблица. */
export const ROLES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Роль' }];

/** Full-view для раскрытия roles. */
export const ROLES_COLUMNS_FULL: TableColumn[] = [
  { key: 'hubLine', label: 'Роль' },
  { key: 'code', label: 'Код' },
  { key: 'notes', label: 'Заметки' },
  { key: 'isActiveLabel', label: 'Активна' },
  { key: 'isSystemLabel', label: 'Системная' },
];

export const USERS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Пользователь' }];

/** Full-view для раскрытия users. */
export const USERS_COLUMNS_FULL: TableColumn[] = [
  { key: 'hubLine', label: 'Пользователь' },
  { key: 'login', label: 'Логин' },
  { key: 'roleLabel', label: 'Роль' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Телефон' },
];
