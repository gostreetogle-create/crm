import { callStandaloneCloseForKey } from './standalone-dictionary-create.back';
import { STANDALONE_DICTIONARY_CREATE, type StandaloneDictionaryCreateKey } from './standalone-dictionary-create.meta';

function buildMockClosers(): Record<StandaloneDictionaryCreateKey, jest.Mock> {
  return Object.fromEntries(
    STANDALONE_DICTIONARY_CREATE.map((row) => [row.key, jest.fn()]),
  ) as Record<StandaloneDictionaryCreateKey, jest.Mock>;
}

describe('callStandaloneCloseForKey', () => {
  it('invokes exactly the closer for the active key', () => {
    const closers = buildMockClosers();
    const key: StandaloneDictionaryCreateKey = 'colors';
    callStandaloneCloseForKey(key, closers);
    expect(closers.colors).toHaveBeenCalledTimes(1);
    for (const row of STANDALONE_DICTIONARY_CREATE) {
      if (row.key !== key) {
        expect(closers[row.key]).not.toHaveBeenCalled();
      }
    }
  });

  it('calls no closers when key is null', () => {
    const closers = buildMockClosers();
    callStandaloneCloseForKey(null, closers);
    for (const row of STANDALONE_DICTIONARY_CREATE) {
      expect(closers[row.key]).not.toHaveBeenCalled();
    }
  });

  it('covers every standalone meta key (contract with navigateBackFromStandaloneDictionaryCreate)', () => {
    const closers = buildMockClosers();
    for (const row of STANDALONE_DICTIONARY_CREATE) {
      closers[row.key].mockClear();
      callStandaloneCloseForKey(row.key, closers);
      expect(closers[row.key]).toHaveBeenCalledTimes(1);
    }
  });
});
