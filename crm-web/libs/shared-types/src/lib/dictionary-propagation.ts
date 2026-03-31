/** Режим распространения изменений связанного справочника (локально / по всем связям). */
export type DictionaryPropagationMode = 'local' | 'global';

export type DictionaryPropagationOptions = { propagation?: DictionaryPropagationMode };
