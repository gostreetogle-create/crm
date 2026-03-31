import type { Route } from '@angular/router';
import { STANDALONE_DICTIONARY_CREATE } from './standalone-dictionary-create.meta';

const loadDictionariesPage = () =>
  import('./pages/dictionaries-page/dictionaries-page').then((m) => m.DictionariesPage);

/**
 * Child-маршруты полноэкранного create (`data.standaloneCreate`).
 * Единый источник с `STANDALONE_DICTIONARY_CREATE` — path/key не расходятся между приложениями.
 */
export function buildStandaloneDictionaryCreateChildRoutes(): Route[] {
  return STANDALONE_DICTIONARY_CREATE.map((row) => ({
    path: row.path,
    loadComponent: loadDictionariesPage,
    data: { standaloneCreate: row.key },
  }));
}
