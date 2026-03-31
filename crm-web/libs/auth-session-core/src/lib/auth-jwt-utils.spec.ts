import { decodeJwtRoleId } from './auth-jwt-utils';

describe('decodeJwtRoleId', () => {
  it('reads roleId from valid JWT payload', () => {
    const payload = btoa(JSON.stringify({ roleId: 'role-sys-admin' }));
    const token = `xx.${payload}.yy`;
    expect(decodeJwtRoleId(token)).toBe('role-sys-admin');
  });

  it('returns null for unknown shape', () => {
    expect(decodeJwtRoleId('not-a-jwt')).toBeNull();
    expect(decodeJwtRoleId('a.b')).toBeNull();
  });

  it('returns null when roleId missing', () => {
    const payload = btoa(JSON.stringify({ sub: 'u1' }));
    const token = `h.${payload}.s`;
    expect(decodeJwtRoleId(token)).toBeNull();
  });
});
