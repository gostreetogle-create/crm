import { STANDALONE_DICTIONARY_CREATE } from './standalone-dictionary-create.meta';
import { buildStandaloneDictionaryCreateChildRoutes } from './standalone-dictionary-create.routes';

describe('buildStandaloneDictionaryCreateChildRoutes', () => {
  it('produces one route per meta row with matching path and data', () => {
    const routes = buildStandaloneDictionaryCreateChildRoutes();
    expect(routes.length).toBe(STANDALONE_DICTIONARY_CREATE.length);
    for (let i = 0; i < STANDALONE_DICTIONARY_CREATE.length; i++) {
      const meta = STANDALONE_DICTIONARY_CREATE[i];
      const r = routes[i];
      expect(r.path).toBe(meta.path);
      expect(r.data).toEqual({ standaloneCreate: meta.key });
      expect(typeof r.loadComponent).toBe('function');
    }
  });
});
