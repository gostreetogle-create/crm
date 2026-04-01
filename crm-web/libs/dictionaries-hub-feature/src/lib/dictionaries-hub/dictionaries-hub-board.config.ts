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

export const HUB_BOARD_DICTIONARY_ROW_DEFS: readonly HubBoardDictionaryRowDef[] = [
  { section: 'Материалы и производство', sectionId: 'dictionary-hub-section-production', key: 'materials', title: 'Материалы' },
  {
    section: 'Материалы и производство',
    sectionId: 'dictionary-hub-section-production',
    key: 'materialCharacteristics',
    title: 'Характеристики материала',
  },
  { section: 'Материалы и производство', sectionId: 'dictionary-hub-section-production', key: 'workTypes', title: 'Вид работ' },
  { section: 'Материалы и производство', sectionId: 'dictionary-hub-section-production', key: 'units', title: 'Единицы измерения' },
  {
    section: 'Материалы и производство',
    sectionId: 'dictionary-hub-section-production',
    key: 'geometries',
    title: 'Форма и габаритные размеры',
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
  'dictionary-hub-section-production',
  'dictionary-hub-section-surface',
  'dictionary-hub-section-clients',
  'dictionary-hub-section-commercial',
  'dictionary-hub-section-access',
];
