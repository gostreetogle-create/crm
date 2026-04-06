/**
 * Мастер-таблица хаба справочников: канонический список плиток (секция + ключ + заголовок).
 * Права фильтруются в `dictionaries-hub-board.ts` / на странице.
 */
export type HubBoardDictionaryRowDef = {
  section: string;
  sectionId: string;
  key: string;
  title: string;
};

/**
 * Секция «Товар»: порядок сверху вниз — комплексы и торговые сущности, затем производственные справочники, затем остальное (единицы, категории).
 */
export const HUB_BOARD_DICTIONARY_ROW_DEFS: readonly HubBoardDictionaryRowDef[] = [
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'catalogComplexes', title: 'Комплексы' },
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'tradeGoods', title: 'Товары' },
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'products', title: 'Изделия' },
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'productionDetails', title: 'Детали' },
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'workTypes', title: 'Вид работ' },
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'materials', title: 'Материалы' },
  {
    section: 'Товар',
    sectionId: 'dictionary-hub-section-goods',
    key: 'materialCharacteristics',
    title: 'Характеристики материала',
  },
  {
    section: 'Товар',
    sectionId: 'dictionary-hub-section-goods',
    key: 'geometries',
    title: 'Форма и габаритные размеры',
  },
  { section: 'Товар', sectionId: 'dictionary-hub-section-goods', key: 'units', title: 'Единицы измерения' },
  {
    section: 'Товар',
    sectionId: 'dictionary-hub-section-goods',
    key: 'tradeGoodCategories',
    title: 'Категории товаров',
  },
  {
    section: 'Товар',
    sectionId: 'dictionary-hub-section-goods',
    key: 'tradeGoodSubcategories',
    title: 'Подкатегории товаров',
  },
  { section: 'Цвет, отделка и покрытия', sectionId: 'dictionary-hub-section-surface', key: 'colors', title: 'Цвета (RAL)' },
  {
    section: 'Цвет, отделка и покрытия',
    sectionId: 'dictionary-hub-section-surface',
    key: 'surfaceFinishes',
    title: 'Тип отделки / шероховатость',
  },
  { section: 'Цвет, отделка и покрытия', sectionId: 'dictionary-hub-section-surface', key: 'coatings', title: 'Покрытие' },
  { section: 'Клиенты', sectionId: 'dictionary-hub-section-clients', key: 'organizations', title: 'Организации' },
  { section: 'Клиенты', sectionId: 'dictionary-hub-section-clients', key: 'clients', title: 'Контактные лица' },
  {
    section: 'Коммерческое предложение',
    sectionId: 'dictionary-hub-section-commercial',
    key: 'kpPhotos',
    title: 'Фото для КП',
  },
  { section: 'Пользователи и доступ', sectionId: 'dictionary-hub-section-access', key: 'roles', title: 'Роли' },
  { section: 'Пользователи и доступ', sectionId: 'dictionary-hub-section-access', key: 'users', title: 'Пользователи' },
];

export const HUB_BOARD_SECTION_ORDER: readonly string[] = [
  'dictionary-hub-section-goods',
  'dictionary-hub-section-surface',
  'dictionary-hub-section-clients',
  'dictionary-hub-section-commercial',
  'dictionary-hub-section-access',
];
