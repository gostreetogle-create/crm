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
  { key: 'supplier', label: 'Поставщик' },
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

export const PRODUCTION_DETAILS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Деталь' }];

export const PRODUCTION_DETAILS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'lineTotalLabel', label: 'Итого ₽' },
  { key: 'materialTotalLabel', label: 'Материал ₽' },
  { key: 'workTotalLabel', label: 'Работы ₽' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const PRODUCTS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Изделие' }];

export const PRODUCTS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Наименование' },
  { key: 'codeLabel', label: 'Артикул' },
  { key: 'descriptionLabel', label: 'Описание' },
  { key: 'colorLabel', label: 'Цвет' },
  { key: 'detailNamesSummary', label: 'Детали' },
  { key: 'workTypesSummary', label: 'Вид работ' },
  { key: 'priceLabel', label: 'Цена ₽' },
  { key: 'costLabel', label: 'Себестоимость ₽' },
  { key: 'linesCountLabel', label: 'Деталей в составе' },
  { key: 'notesLabel', label: 'Заметка' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const TRADE_GOOD_CATEGORIES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Категория' }];

export const TRADE_GOOD_CATEGORIES_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'sortOrderLabel', label: 'Порядок' },
  { key: 'isActiveLabel', label: 'Активна' },
];

export const TRADE_GOOD_SUBCATEGORIES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Подкатегория' }];

export const TRADE_GOOD_SUBCATEGORIES_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'categoryNameLabel', label: 'Категория' },
  { key: 'sortOrderLabel', label: 'Порядок' },
  { key: 'isActiveLabel', label: 'Активна' },
];

/** Торговая позиция: товар (изделие в составе) или комплекс (другие товары в составе). */
export const TRADE_GOODS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Позиция' }];

export const TRADE_GOODS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Наименование' },
  { key: 'kindLabel', label: 'Тип' },
  { key: 'codeLabel', label: 'Артикул' },
  { key: 'categoryLabel', label: 'Категория' },
  { key: 'subcategoryLabel', label: 'Подкатегория' },
  { key: 'unitCodeLabel', label: 'Ед. изм.' },
  { key: 'descriptionLabel', label: 'Описание' },
  { key: 'productsSummaryLabel', label: 'Состав' },
  { key: 'priceLabel', label: 'Цена ₽' },
  { key: 'costLabel', label: 'Себестоимость ₽' },
  { key: 'linesCountLabel', label: 'Позиций в составе' },
  { key: 'notesLabel', label: 'Заметка' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const CATALOG_COMPLEXES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Комплекс' }];

export const CATALOG_COMPLEXES_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'codeLabel', label: 'Код' },
  { key: 'descriptionLabel', label: 'Описание' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const CATALOG_PRODUCTS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Каталожный товар' }];

export const CATALOG_PRODUCTS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Наименование' },
  { key: 'complexNameLabel', label: 'Комплекс' },
  { key: 'codeLabel', label: 'Код' },
  { key: 'descriptionLabel', label: 'Описание' },
  { key: 'priceLabel', label: 'Цена' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const CATALOG_ARTICLES_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Позиция' }];

export const CATALOG_ARTICLES_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Наименование' },
  { key: 'productNameLabel', label: 'Каталожный товар' },
  { key: 'codeLabel', label: 'Код' },
  { key: 'descriptionLabel', label: 'Описание' },
  { key: 'qtyLabel', label: 'Кол-во' },
  { key: 'sortOrderLabel', label: 'Порядок' },
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
  { key: 'photoFileName', label: 'Файл на сервере' },
  { key: 'isActiveLabel', label: 'Активен' },
];

export const COMMERCIAL_OFFERS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Коммерческое предложение' }];

export const COMMERCIAL_OFFERS_COLUMNS_FULL: TableColumn[] = [
  { key: 'numberOrTitle', label: 'Номер / заголовок' },
  { key: 'statusLabel', label: 'Статус' },
  { key: 'recipientLabel', label: 'Получатель' },
  { key: 'totalAmountLabel', label: 'Итого ₽' },
  { key: 'updatedAtLabel', label: 'Обновлено' },
];

export const ORDERS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Заказ' }];

export const ORDERS_COLUMNS_FULL: TableColumn[] = [
  { key: 'orderNumber', label: 'Номер заказа' },
  { key: 'customerLabel', label: 'Заказчик' },
  { key: 'deadlineLabel', label: 'Срок' },
  { key: 'offerNumberLabel', label: 'Номер КП' },
  { key: 'linesLabel', label: 'Состав (без цен)' },
  { key: 'updatedAtLabel', label: 'Обновлено' },
];

export const COLORS_COLUMNS: TableColumn[] = [{ key: 'hubLine', label: 'Цвет', swatchHexKey: 'hex' }];

/** Full-view для раскрытия colors. */
export const COLORS_COLUMNS_FULL: TableColumn[] = [
  { key: 'name', label: 'Название' },
  { key: 'ralCode', label: 'Код RAL' },
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
