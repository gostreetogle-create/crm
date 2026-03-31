import { describeAuthHttpError, isUnauthorizedHttpError } from './auth-http-error.utils';

describe('auth-http-error.utils', () => {
  it('detects 401/403', () => {
    expect(isUnauthorizedHttpError({ status: 401 })).toBe(true);
    expect(isUnauthorizedHttpError({ status: 403 })).toBe(true);
    expect(isUnauthorizedHttpError({ status: 500 })).toBe(false);
    expect(isUnauthorizedHttpError(new Error('x'))).toBe(false);
  });

  it('describes duck-typed http error', () => {
    expect(describeAuthHttpError({ status: 401, url: '/api/x' })).toContain('401');
  });
});
