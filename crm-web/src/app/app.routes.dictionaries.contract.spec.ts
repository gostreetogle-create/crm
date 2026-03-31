import type { Route } from '@angular/router';
import { canonicalDictionariesChildSegments, DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS } from '@srm/dictionaries-hub-feature';
import { appRoutes } from './app.routes';

describe('app.routes /справочники contract', () => {
  it('child path segments match canonical list (smoke: registered routes, deep links)', () => {
    const dict = appRoutes.find((r) => r.path === 'справочники');
    const children = dict?.children as Route[] | undefined;
    const actual = (children ?? []).map((c) => c.path ?? '').sort();
    const expected = [...canonicalDictionariesChildSegments()].sort();
    expect(actual).toEqual(expected);
  });

  it('keeps public redirect contract for legacy entry paths', () => {
    const redirects = appRoutes
      .filter((r) => r.redirectTo === '/справочники')
      .map((r) => r.path)
      .filter((p): p is string => typeof p === 'string')
      .sort();
    expect(redirects).toEqual([...DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS].sort());
  });
});
