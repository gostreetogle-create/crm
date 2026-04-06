import { requireEffectivePermissionKey } from "./require-effective-permission.js";

/**
 * Доступ к API справочника по ключу `dict.hub.*` (согласовано с матрицей и дефолтами по коду роли).
 */
export function requireDictionaryHubPermission(requiredKey: string) {
  return requireEffectivePermissionKey(requiredKey);
}
