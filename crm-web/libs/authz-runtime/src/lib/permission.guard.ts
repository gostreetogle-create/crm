import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionsService } from './permissions.service';
import { PermissionKey } from '@srm/authz-core';

/**
 * Проверка права из `route.data`:
 * - `permission: PermissionKey | PermissionKey[]`
 * - `permissionMode?: 'all' | 'any'` (по умолчанию `all` — нужны все перечисленные).
 *
 * При отказе — редирект на `data.fallbackRoute` или `/dictionaries`.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const raw = route.data['permission'] as PermissionKey | PermissionKey[] | undefined;
  if (raw == null) {
    return true;
  }
  const keys = (Array.isArray(raw) ? raw : [raw]) as PermissionKey[];
  if (keys.length === 0) {
    return true;
  }
  const permissions = inject(PermissionsService);
  const mode = route.data['permissionMode'] as 'all' | 'any' | undefined;
  const allowed =
    mode === 'any' ? permissions.hasAny(keys) : keys.every((k) => permissions.can(k));
  if (allowed) {
    return true;
  }
  if (isDevMode()) {
    const missing = keys.filter((k) => !permissions.can(k));
    console.debug('[permissionGuard] denied', {
      keys,
      mode: mode ?? 'all',
      missing,
      roleId: permissions.role(),
    });
  }
  const router = inject(Router);
  const fallback = route.data['fallbackRoute'] as string | undefined;
  // Важно: дефолтный редирект не должен возвращать на ту же страницу,
  // иначе получаем редирект-цикл (визуально «ничего не происходит»).
  // `/` ведёт на страницу логина.
  return router.createUrlTree([fallback ?? '/'], {
    queryParams: {
      accessDenied: keys.join(','),
    },
  });
};
