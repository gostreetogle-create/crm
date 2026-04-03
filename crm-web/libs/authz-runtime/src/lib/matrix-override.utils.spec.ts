import { parseMatrixOverride, stripDictHubKeysIfNoPageSection } from './matrix-override.utils';

describe('stripDictHubKeysIfNoPageSection', () => {
  it('keeps dict.hub.* when page.dictionaries is present', () => {
    const keys = ['page.dictionaries', 'dict.hub.materials', 'dict.hub.colors'] as const;
    expect(stripDictHubKeysIfNoPageSection(keys)).toEqual([...keys]);
  });

  it('removes all dict.hub.* when page.dictionaries is absent', () => {
    expect(
      stripDictHubKeysIfNoPageSection(['dict.hub.materials', 'dict.hub.colors'] as const),
    ).toEqual([]);
  });

  it('keeps non-hub keys when page.dictionaries is absent', () => {
    expect(
      stripDictHubKeysIfNoPageSection(['crud.create', 'dict.hub.units', 'page.admin.settings'] as const),
    ).toEqual(['crud.create', 'page.admin.settings']);
  });
});

describe('parseMatrixOverride', () => {
  it('returns null for empty input', () => {
    expect(parseMatrixOverride(null)).toBeNull();
    expect(parseMatrixOverride('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseMatrixOverride('{not json')).toBeNull();
  });

  it('keeps role row as empty when only dict.hub.* remain after strip', () => {
    const raw = JSON.stringify({
      'role-seed-director': ['dict.hub.materials'],
    });
    expect(parseMatrixOverride(raw)).toEqual({
      'role-seed-director': [],
    });
  });

  it('preserves explicit empty permission list', () => {
    const raw = JSON.stringify({
      'role-seed-director': [],
    });
    expect(parseMatrixOverride(raw)).toEqual({
      'role-seed-director': [],
    });
  });

  it('keeps dict.hub.* together with page.dictionaries', () => {
    const raw = JSON.stringify({
      'role-seed-director': ['page.dictionaries', 'dict.hub.materials'],
    });
    expect(parseMatrixOverride(raw)).toEqual({
      'role-seed-director': ['page.dictionaries', 'dict.hub.materials'],
    });
  });

  it('maps legacy role code keys to role ids', () => {
    const raw = JSON.stringify({
      viewer: ['page.dictionaries'],
    });
    expect(parseMatrixOverride(raw)).toEqual({
      'role-sys-viewer': ['page.dictionaries'],
    });
  });

  it('filters unknown permission strings', () => {
    const raw = JSON.stringify({
      'role-seed-director': ['page.dictionaries', 'not.a.real.permission'],
    });
    expect(parseMatrixOverride(raw)).toEqual({
      'role-seed-director': ['page.dictionaries'],
    });
  });
});
