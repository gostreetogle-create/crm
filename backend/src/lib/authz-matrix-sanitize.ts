import { AUTHZ_PERMISSION_KEY_SET } from './authz-permission-keys.js';

/** Единая санитизация матрицы при чтении из БД и при записи (неизвестные роли, ключи, dict.hub без раздела). */
export function sanitizeAuthzMatrixPayload(
  matrix: Record<string, string[]>,
  knownRoleIds: ReadonlySet<string>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [roleId, keys] of Object.entries(matrix)) {
    if (!knownRoleIds.has(roleId) || !Array.isArray(keys)) {
      continue;
    }
    let validKeys = keys.filter((k) => AUTHZ_PERMISSION_KEY_SET.has(k));
    if (!validKeys.includes('page.dictionaries')) {
      validKeys = validKeys.filter((k) => !k.startsWith('dict.hub.'));
    }
    /** Пустой массив — явное «нет прав» для роли, не опускать из JSON. */
    out[roleId] = validKeys;
  }
  return out;
}
