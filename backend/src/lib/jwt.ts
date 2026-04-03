import * as jose from 'jose';
import { config } from '../config.js';

const encoder = new TextEncoder();

function secretKey(): Uint8Array {
  return encoder.encode(config.jwtSecret);
}

export type AccessTokenPayload = {
  userId: string;
  login: string;
  roleId: string;
  /** Заполняется в токенах после расширения JWT; иначе `requireAdmin` читает роль из БД. */
  roleCode?: string;
  isSystemRole?: boolean;
};

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const body: Record<string, unknown> = {
    login: payload.login,
    roleId: payload.roleId,
  };
  if (typeof payload.roleCode === 'string' && typeof payload.isSystemRole === 'boolean') {
    body.roleCode = payload.roleCode;
    body.isSystemRole = payload.isSystemRole;
  }
  return new jose.SignJWT(body)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jose.jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
  const userId = payload.sub;
  const login = payload.login;
  const roleId = payload.roleId;
  const roleCode = payload.roleCode;
  const isSystemRole = payload.isSystemRole;
  if (typeof userId !== 'string' || typeof login !== 'string' || typeof roleId !== 'string') {
    throw new Error('invalid_token_payload');
  }
  const out: AccessTokenPayload = { userId, login, roleId };
  if (typeof roleCode === 'string' && typeof isSystemRole === 'boolean') {
    out.roleCode = roleCode;
    out.isSystemRole = isSystemRole;
  }
  return out;
}
