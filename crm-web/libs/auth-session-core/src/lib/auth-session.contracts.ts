export const AUTH_TOKEN_STORAGE_KEY = 'crm.auth.token';
export const LEGACY_AUTH_STORAGE_KEY = 'crm.authenticated';
export const AUTH_TOKEN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type AuthUserDto = {
  id: string;
  login: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
};

export type LoginResponse = { token: string; user: AuthUserDto };
export type MeResponse = { user: AuthUserDto };
