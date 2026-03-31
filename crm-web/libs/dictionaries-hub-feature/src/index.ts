export { DictionariesPage } from './lib/pages/dictionaries-page/dictionaries-page';
export { DictionariesShellComponent } from './lib/pages/dictionaries-shell/dictionaries-shell';
export { DICTIONARIES_ROUTE_PROVIDERS } from './lib/dictionaries-route.providers';
export { DictionaryStandaloneCreateShellComponent } from './lib/components/dictionary-standalone-create-shell/dictionary-standalone-create-shell.component';
export {
  STANDALONE_DICTIONARY_CREATE,
  isStandaloneDictionaryCreateKey,
  type StandaloneDictionaryCreateKey,
} from './lib/standalone-dictionary-create.meta';
export { buildStandaloneDictionaryCreateChildRoutes } from './lib/standalone-dictionary-create.routes';
export {
  DICTIONARIES_HUB_BASE,
  STATIC_DICTIONARIES_CHILD_SEGMENTS,
  canonicalDictionariesChildSegments,
  canonicalDictionariesUrls,
} from './lib/dictionaries-canonical-paths';
export { scrollToFirstInvalidControlInForm } from './lib/dictionaries-form-a11y';
