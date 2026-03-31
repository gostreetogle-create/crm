import { canonicalDictionariesChildSegments, canonicalDictionariesUrls } from './dictionaries-canonical-paths';
import { STANDALONE_DICTIONARY_CREATE } from './standalone-dictionary-create.meta';
import { buildStandaloneDictionaryCreateChildRoutes } from './standalone-dictionary-create.routes';

describe('dictionaries-canonical-paths', () => {
  it('includes every standalone meta path', () => {
    const segments = canonicalDictionariesChildSegments();
    for (const row of STANDALONE_DICTIONARY_CREATE) {
      expect(segments).toContain(row.path);
    }
  });

  it('matches buildStandaloneDictionaryCreateChildRoutes order and paths', () => {
    const routes = buildStandaloneDictionaryCreateChildRoutes();
    expect(routes.map((r) => r.path)).toEqual(STANDALONE_DICTIONARY_CREATE.map((x) => x.path));
  });

  it('produces unique full URLs', () => {
    const urls = canonicalDictionariesUrls();
    expect(new Set(urls).size).toBe(urls.length);
  });
});
