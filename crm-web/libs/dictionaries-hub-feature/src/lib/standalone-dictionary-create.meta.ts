/**
 * Полноэкранное создание записей справочника (child-маршруты `/справочники/...`).
 * Ключ = `data.standaloneCreate` на маршруте; path — сегмент URL.
 */
export const STANDALONE_DICTIONARY_CREATE = [
  { key: 'workTypes', path: 'новый-вид-работ', title: 'Новый вид работ' },
  { key: 'units', path: 'новая-единица-измерения', title: 'Новая единица измерения' },
  { key: 'geometries', path: 'новая-геометрия', title: 'Новая форма и габаритные размеры' },
  { key: 'colors', path: 'новый-цвет-ral', title: 'Новый цвет RAL' },
  { key: 'surfaceFinishes', path: 'новая-отделка', title: 'Новый тип отделки / шероховатость' },
  { key: 'coatings', path: 'новое-покрытие', title: 'Новое покрытие' },
  { key: 'organizations', path: 'новая-организация', title: 'Новая организация' },
  { key: 'clients', path: 'новый-контакт', title: 'Новое контактное лицо' },
  { key: 'roles', path: 'новая-роль', title: 'Новая роль' },
  { key: 'users', path: 'новый-пользователь', title: 'Новый пользователь' },
] as const;

export type StandaloneDictionaryCreateKey = (typeof STANDALONE_DICTIONARY_CREATE)[number]['key'];

const STANDALONE_DICTIONARY_CREATE_KEY_SET = new Set<string>(
  STANDALONE_DICTIONARY_CREATE.map((row) => row.key),
);

/** Сужение `route.snapshot.data['standaloneCreate']` и произвольных строк. */
export function isStandaloneDictionaryCreateKey(value: unknown): value is StandaloneDictionaryCreateKey {
  return typeof value === 'string' && STANDALONE_DICTIONARY_CREATE_KEY_SET.has(value);
}

