import type { Route } from '@angular/router';
import { canonicalDictionariesChildSegments } from '@srm/dictionaries-hub-feature';
import { appRoutes } from './app.routes';

describe('app.routes /справочники contract', () => {
  it('child path segments match canonical list (smoke: registered routes, deep links)', () => {
    const dict = appRoutes.find((r) => r.path === 'справочники');
    const children = dict?.children as Route[] | undefined;
    const actual = (children ?? []).map((c) => c.path ?? '').sort();
    const expected = [...canonicalDictionariesChildSegments()].sort();
    expect(actual).toEqual(expected);
  });
});
