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
};

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new jose.SignJWT({ login: payload.login, roleId: payload.roleId })
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
  if (typeof userId !== 'string' || typeof login !== 'string' || typeof roleId !== 'string') {
    throw new Error('invalid_token_payload');
  }
  return { userId, login, roleId };
}
