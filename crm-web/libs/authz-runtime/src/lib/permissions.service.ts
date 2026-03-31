import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CrudPermissions,
  DEFAULT_ROLE_PERMISSIONS_BY_CODE,
  PERMISSION_KEYS_ORDERED,
  PermissionKey,
  RoleId,
} from '@srm/authz-core';
import { AUTHZ_ROLE_CONTEXT, AUTHZ_SYSTEM_ROLE_IDS } from './authz-role-context.token';

const STORAGE_KEY_ROLE = 'crm.currentRole';
const STORAGE_KEY_MATRIX = 'crm.authz.matrixOverride';

const VALID_PERMISSIONS = new Set<PermissionKey>(PERMISSION_KEYS_ORDERED);

/**
 * Без запроса в `/api/roles` (и до загрузки `RolesStore`) мы всё равно должны уметь вычислить код роли,
 * чтобы дефолтные права (по `DEFAULT_ROLE_PERMISSIONS_BY_CODE`) применялись на первом роутинге.
 *
 * Это мост между `roleId` в JWT (и localStorage) и `role code`, используемым в каноне матрицы по умолчанию.
 */
const DEFAULT_ROLE_CODE_BY_ROLE_ID: Readonly<Record<RoleId, string>> = {
  'role-sys-admin': 'admin',
  'role-sys-editor': 'editor',
  'role-sys-viewer': 'viewer',
  'role-seed-director': 'director',
  'role-seed-accountant': 'accountant',
};

/** Старые ключи матрицы в localStorage до перехода на id ролей. */
const LEGACY_ROLE_CODE_TO_ID: Readonly<Record<string, string>> = {
  admin: 'role-sys-admin',
  editor: 'role-sys-editor',
  viewer: 'role-sys-viewer',
};

function normalizeMatrixRoleKey(key: string): string {
  return LEGACY_ROLE_CODE_TO_ID[key] ?? key;
}

function parseMatrixOverride(raw: string | null): Partial<Record<RoleId, PermissionKey[]>> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const out: Partial<Record<RoleId, PermissionKey[]>> = {};
    for (const [key, arr] of Object.entries(parsed as Record<string, unknown>)) {
      const roleId = normalizeMatrixRoleKey(key);
      if (!Array.isArray(arr)) {
        continue;
      }
      const keys = arr.filter((x): x is PermissionKey => VALID_PERMISSIONS.has(x as PermissionKey));
      if (keys.length) {
        out[roleId] = keys;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Локальная роль и права до API. Матрицу можно переопределить в «Админ-настройках» (localStorage).
 * Роли — из справочника (`RolesStore`). Суперадмин (`isSystem`) всегда со всеми ключами из `PERMISSION_KEYS_ORDERED`.
 * Остальные: без переопределения матрицы — `DEFAULT_ROLE_PERMISSIONS_BY_CODE[code]` или `[]`.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly roleContext = inject(AUTHZ_ROLE_CONTEXT);
  private readonly systemRoleIds = inject(AUTHZ_SYSTEM_ROLE_IDS);
  private readonly roleSignal = signal<RoleId>(this.readRoleFromStorage());
  private readonly matrixOverrideSignal = signal<Partial<Record<RoleId, PermissionKey[]>> | null>(
    this.readMatrixFromStorage(),
  );
  private readonly matrixBumpSignal = signal(0);

  readonly role = computed(() => this.roleSignal());
  readonly matrixBump = computed(() => this.matrixBumpSignal());

  readonly permissionSet = computed(() => {
    const roleId = this.roleSignal();
    return new Set(this.effectiveKeysForRole(roleId));
  });

  readonly crud = computed<CrudPermissions>(() => {
    const set = this.permissionSet();
    return {
      canCreate: set.has('crud.create'),
      canEdit: set.has('crud.edit'),
      canDelete: set.has('crud.delete'),
      canDuplicate: set.has('crud.duplicate'),
    };
  });

  can(permission: PermissionKey): boolean {
    return this.permissionSet().has(permission);
  }

  hasAny(permissions: ReadonlyArray<PermissionKey>): boolean {
    const set = this.permissionSet();
    return permissions.some((p) => set.has(p));
  }

  defaultKeysForRoleCode(code: string): ReadonlyArray<PermissionKey> {
    return DEFAULT_ROLE_PERMISSIONS_BY_CODE[code] ?? [];
  }

  /** Суперадмин (`isSystem`): всегда полный набор прав, матрица не ограничивает. */
  isSuperAdminRole(roleId: RoleId): boolean {
    // Важно: `RolesStore` подтягивает роли асинхронно (и некоторые эндпоинты требуют auth),
    // поэтому на момент первой навигации `rolesStore.items` может быть пустым.
    // Для системной админ-ролы считаем права сразу, чтобы `authGuard/permissionGuard`
    // не блокировали UI на входе.
    return roleId === this.systemRoleIds.admin || this.roleContext.roleById(roleId)?.isSystem === true;
  }

  effectiveKeysForRole(roleId: RoleId): ReadonlyArray<PermissionKey> {
    if (this.isSuperAdminRole(roleId)) {
      return [...PERMISSION_KEYS_ORDERED];
    }
    const o = this.matrixOverrideSignal();
    if (o && Object.prototype.hasOwnProperty.call(o, roleId) && o[roleId] !== undefined) {
      return o[roleId]!;
    }
    const item = this.roleContext.roleById(roleId);
    const code = item?.code?.trim() ?? DEFAULT_ROLE_CODE_BY_ROLE_ID[roleId] ?? '';
    return this.defaultKeysForRoleCode(code);
  }

  hasPermissionForRole(roleId: RoleId, key: PermissionKey): boolean {
    return this.effectiveKeysForRole(roleId).includes(key);
  }

  /** Есть ли сохранённое переопределение матрицы именно для этой роли. */
  roleHasExplicitMatrixOverride(roleId: RoleId): boolean {
    if (this.isSuperAdminRole(roleId)) {
      return false;
    }
    const o = this.matrixOverrideSignal();
    return !!(o && Object.prototype.hasOwnProperty.call(o, roleId) && o[roleId] !== undefined);
  }

  setMatrixPermission(roleId: RoleId, key: PermissionKey, enabled: boolean): void {
    if (this.isSuperAdminRole(roleId)) {
      return;
    }
    const nextKeys = [...this.effectiveKeysForRole(roleId)];
    const i = nextKeys.indexOf(key);
    if (enabled && i < 0) {
      nextKeys.push(key);
    }
    if (!enabled && i >= 0) {
      nextKeys.splice(i, 1);
    }
    const prev = { ...(this.matrixOverrideSignal() ?? {}) };
    prev[roleId] = nextKeys;
    this.persistMatrixOverride(prev);
  }

  resetRoleMatrixToDefault(roleId: RoleId): void {
    if (this.isSuperAdminRole(roleId)) {
      return;
    }
    const prev = { ...(this.matrixOverrideSignal() ?? {}) };
    delete prev[roleId];
    this.persistMatrixOverrideOrClear(prev);
  }

  resetAllMatrixOverrides(): void {
    this.matrixOverrideSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY_MATRIX);
    } catch {
      // no-op
    }
    this.matrixBumpSignal.update((n) => n + 1);
  }

  setRole(roleId: RoleId): void {
    this.roleSignal.set(roleId);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, roleId);
    } catch {
      // no-op for restricted environments
    }
    try {
      sessionStorage.setItem(STORAGE_KEY_ROLE, roleId);
    } catch {
      // no-op
    }
  }

  /** После выхода: сбросить сохранённую «роль интерфейса», чтобы не тянуть прошлую роль из localStorage. */
  resetRoleAfterLogout(): void {
    this.roleSignal.set(this.systemRoleIds.viewer);
    try {
      localStorage.removeItem(STORAGE_KEY_ROLE);
    } catch {
      // no-op
    }
    try {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
    } catch {
      // no-op
    }
  }

  readonly orderedPermissionKeys = PERMISSION_KEYS_ORDERED;

  /** Есть ли хотя бы одно сохранённое переопределение матрицы в этом браузере. */
  hasAnyMatrixOverride(): boolean {
    const o = this.matrixOverrideSignal();
    return !!(o && Object.keys(o).length > 0);
  }

  private readRoleFromStorage(): RoleId {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY_ROLE) ?? sessionStorage.getItem(STORAGE_KEY_ROLE);
      if (!raw) {
        // Safe default: если роль ещё неизвестна (rolesStore мог не подгрузиться),
        // не выдаём лишних прав. Это предотвращает «привилегии по умолчанию».
        return this.systemRoleIds.viewer;
      }
      const migrated = LEGACY_ROLE_CODE_TO_ID[raw] ?? raw;
      return migrated;
    } catch {
      // no-op for restricted environments
    }
    return this.systemRoleIds.viewer;
  }

  private readMatrixFromStorage(): Partial<Record<RoleId, PermissionKey[]>> | null {
    try {
      const parsed = parseMatrixOverride(localStorage.getItem(STORAGE_KEY_MATRIX));
      if (!parsed) {
        return null;
      }
      const { [this.systemRoleIds.admin]: _adminDrop, ...rest } = parsed;
      return Object.keys(rest).length > 0 ? rest : null;
    } catch {
      return null;
    }
  }

  private persistMatrixOverride(next: Partial<Record<RoleId, PermissionKey[]>>): void {
    this.persistMatrixOverrideOrClear(next);
  }

  private persistMatrixOverrideOrClear(next: Partial<Record<RoleId, PermissionKey[]>>): void {
    const { [this.systemRoleIds.admin]: _a, ...cleaned } = next;
    if (Object.keys(cleaned).length === 0) {
      this.resetAllMatrixOverrides();
      return;
    }
    this.matrixOverrideSignal.set(cleaned);
    try {
      localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(cleaned));
    } catch {
      // no-op
    }
    this.matrixBumpSignal.update((n) => n + 1);
  }
}

