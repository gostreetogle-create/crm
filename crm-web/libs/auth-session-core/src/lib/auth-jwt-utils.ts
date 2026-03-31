/**
 * Без верификации подписи: только чтение `roleId` из payload до первого `/auth/me` (например F5).
 */
export function decodeJwtRoleId(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const obj = JSON.parse(json) as { roleId?: unknown };
    return typeof obj.roleId === 'string' ? obj.roleId : null;
  } catch {
    return null;
  }
}
