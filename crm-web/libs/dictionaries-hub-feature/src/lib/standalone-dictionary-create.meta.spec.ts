import { STANDALONE_DICTIONARY_CREATE, isStandaloneDictionaryCreateKey } from './standalone-dictionary-create.meta';

describe('standalone-dictionary-create meta', () => {
  it('isStandaloneDictionaryCreateKey accepts only known keys', () => {
    expect(isStandaloneDictionaryCreateKey('workTypes')).toBe(true);
    expect(isStandaloneDictionaryCreateKey('units')).toBe(true);
    expect(isStandaloneDictionaryCreateKey('unknown')).toBe(false);
    expect(isStandaloneDictionaryCreateKey(null)).toBe(false);
    expect(isStandaloneDictionaryCreateKey(undefined)).toBe(false);
  });

  it('STANDALONE_DICTIONARY_CREATE has unique paths and keys', () => {
    const keys = STANDALONE_DICTIONARY_CREATE.map((x) => x.key);
    const paths = STANDALONE_DICTIONARY_CREATE.map((x) => x.path);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
