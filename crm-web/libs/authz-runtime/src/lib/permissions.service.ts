import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CrudPermissions,
  DEFAULT_ROLE_PERMISSIONS_BY_CODE,
  PERMISSION_KEYS_ORDERED,
  PermissionKey,
  RoleId,
} from '@srm/authz-core';
import { API_CONFIG } from '@srm/platform-core';
import { RolesStore } from '@srm/dictionaries-state';
import { firstValueFrom } from 'rxjs';
import { AUTHZ_ROLE_CONTEXT, AUTHZ_SYSTEM_ROLE_IDS } from './authz-role-context.token';
import {
  normalizeMatrixRoleKey,
  parseMatrixOverride,
  stripDictHubKeysIfNoPageSection,
} from './matrix-override.utils';

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

/**
 * Матрица прав: **сервер** (`GET/PUT /api/authz-matrix`) — источник истины; `localStorage` — только кэш после ответа сервера.
 * Роли — из `RolesStore`. Суперадмин: полный набор, матрица не ограничивает.
 * Остальные без строки в матрице — `DEFAULT_ROLE_PERMISSIONS_BY_CODE[code]` или `[]`.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly roleContext = inject(AUTHZ_ROLE_CONTEXT);
  private readonly systemRoleIds = inject(AUTHZ_SYSTEM_ROLE_IDS);
  private readonly rolesStore = inject(RolesStore);
  private readonly roleSignal = signal<RoleId>(this.readRoleFromStorage());
  private readonly matrixOverrideSignal = signal<Partial<Record<RoleId, PermissionKey[]>> | null>(
    this.readMatrixFromStorage(),
  );
  private readonly matrixBumpSignal = signal(0);
  private readonly matrixSyncErrorSignal = signal<string | null>(null);
  private serverPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly serverPersistDebounceMs = 600;

  readonly role = computed(() => this.roleSignal());
  readonly matrixBump = computed(() => this.matrixBumpSignal());
  /** Ошибка последней синхронизации матрицы с сервера (чтение); не блокирует локальный кэш. */
  readonly matrixSyncError = this.matrixSyncErrorSignal.asReadonly();

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
    const item = this.roleContext.roleById(roleId);
    const raw = item?.code?.trim() ?? DEFAULT_ROLE_CODE_BY_ROLE_ID[roleId] ?? '';
    const code = raw.toLowerCase();

    let keys: readonly PermissionKey[];
    const o = this.matrixOverrideSignal();
    if (o && Object.prototype.hasOwnProperty.call(o, roleId) && o[roleId] !== undefined) {
      keys = o[roleId]!;
    } else {
      keys = this.defaultKeysForRoleCode(code);
    }

    /** Код `admin`: не даём урезанной матрице отключать bulk и прочие права — объединяем с полным дефолтом. */
    if (code === 'admin') {
      keys = [...new Set([...DEFAULT_ROLE_PERMISSIONS_BY_CODE['admin'], ...keys])];
    }

    return stripDictHubKeysIfNoPageSection(keys);
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
    if (key === 'page.dictionaries' && !enabled) {
      const filtered = nextKeys.filter((k) => !k.startsWith('dict.hub.'));
      nextKeys.length = 0;
      nextKeys.push(...filtered);
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

  /** Все галочки в колонке роли сняты: сохраняем явный `[]` (не «дефолт по коду»). */
  clearAllMatrixPermissionsForRole(roleId: RoleId): void {
    if (this.isSuperAdminRole(roleId)) {
      return;
    }
    const prev = { ...(this.matrixOverrideSignal() ?? {}) };
    prev[roleId] = [];
    this.persistMatrixOverride(prev);
  }

  resetAllMatrixOverrides(): void {
    this.matrixOverrideSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY_MATRIX);
    } catch {
      // no-op
    }
    this.matrixBumpSignal.update((n) => n + 1);
    void this.flushMatrixToServer();
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

  clearMatrixSyncError(): void {
    this.matrixSyncErrorSignal.set(null);
  }

  /** Есть ли отложенная запись матрицы на сервер (debounce) — не перезатирать локальные правки синком с GET. */
  hasPendingMatrixPersist(): boolean {
    return this.serverPersistTimer !== null;
  }

  /** После выхода: сбросить роль и кэш матрицы (при следующем входе — только с сервера). */
  resetRoleAfterLogout(): void {
    this.matrixSyncErrorSignal.set(null);
    this.roleSignal.set(this.systemRoleIds.admin);
    this.matrixOverrideSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY_MATRIX);
    } catch {
      // no-op
    }
    this.matrixBumpSignal.update((n) => n + 1);
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

  /**
   * Подтянуть матрицу с сервера после входа. Сервер — канон: `null` сбрасывает кэш (иначе после db:reset остаётся мусор).
   */
  async syncMatrixFromServer(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ matrix: Record<string, string[]> | null }>(this.apiUrl('/authz-matrix')),
      );
      this.matrixSyncErrorSignal.set(null);
      if (res.matrix === null || res.matrix === undefined) {
        this.matrixOverrideSignal.set(null);
        try {
          localStorage.removeItem(STORAGE_KEY_MATRIX);
        } catch {
          // no-op
        }
        this.matrixBumpSignal.update((n) => n + 1);
        return;
      }
      this.applyMatrixPayloadFromServer(res.matrix);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Не удалось синхронизировать матрицу прав';
      this.matrixSyncErrorSignal.set(msg);
    }
  }

  /** Синхронизация без гонки с debounced PUT админа. */
  async syncMatrixFromServerSafe(): Promise<void> {
    if (this.hasPendingMatrixPersist()) {
      return;
    }
    await this.syncMatrixFromServer();
  }

  private apiUrl(path: string): string {
    const base = this.apiConfig.baseUrl.replace(/\/$/, '');
    return `${base}/api${path}`;
  }

  private applyMatrixPayloadFromServer(raw: Record<string, string[]>): void {
    const normalized: Partial<Record<RoleId, PermissionKey[]>> = {};
    for (const [k, arr] of Object.entries(raw)) {
      const roleId = normalizeMatrixRoleKey(k);
      if (!Array.isArray(arr)) {
        continue;
      }
      const keys = stripDictHubKeysIfNoPageSection(
        arr.filter((x): x is PermissionKey => VALID_PERMISSIONS.has(x as PermissionKey)),
      );
      normalized[roleId as RoleId] = keys;
    }
    const { [this.systemRoleIds.admin]: _adminDrop, ...rest } = normalized;
    const cleaned = Object.keys(rest).length > 0 ? rest : null;
    this.matrixOverrideSignal.set(cleaned);
    try {
      if (cleaned === null) {
        localStorage.removeItem(STORAGE_KEY_MATRIX);
      } else {
        localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(cleaned));
      }
    } catch {
      // no-op
    }
    this.matrixBumpSignal.update((n) => n + 1);
  }

  private scheduleMatrixServerPersist(): void {
    if (!this.can('page.admin.settings')) {
      return;
    }
    if (this.serverPersistTimer) {
      clearTimeout(this.serverPersistTimer);
    }
    this.serverPersistTimer = setTimeout(() => {
      this.serverPersistTimer = null;
      void this.flushMatrixToServer();
    }, this.serverPersistDebounceMs);
  }

  /** Немедленная запись матрицы на сервер (сброс «все переопределения»). */
  private flushMatrixToServer(): Promise<void> {
    if (!this.can('page.admin.settings')) {
      return Promise.resolve();
    }
    let o = this.matrixOverrideSignal();
    if (this.rolesStore.items().length > 0) {
      const pruned = this.pruneMatrixToKnownRoles(o);
      if (JSON.stringify(pruned) !== JSON.stringify(o)) {
        this.matrixOverrideSignal.set(pruned);
        try {
          if (pruned && Object.keys(pruned).length > 0) {
            localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(pruned));
          } else {
            localStorage.removeItem(STORAGE_KEY_MATRIX);
          }
        } catch {
          // no-op
        }
        this.matrixBumpSignal.update((n) => n + 1);
        o = pruned;
      }
    }
    const body = { matrix: o && Object.keys(o).length > 0 ? o : null };
    return firstValueFrom(
      this.http.put<{ matrix?: Record<string, string[]> | null }>(this.apiUrl('/authz-matrix'), body),
    )
      .then((res) => {
        if (res?.matrix != null) {
          this.applyMatrixPayloadFromServer(res.matrix);
        } else {
          this.matrixOverrideSignal.set(null);
          try {
            localStorage.removeItem(STORAGE_KEY_MATRIX);
          } catch {
            // no-op
          }
          this.matrixBumpSignal.update((n) => n + 1);
        }
      })
      .catch(() => undefined);
  }

  /** Убрать из матрицы ключи ролей, которых нет в справочнике (после сброса БД / импорта). */
  private pruneMatrixToKnownRoles(
    m: Partial<Record<RoleId, PermissionKey[]>> | null,
  ): Partial<Record<RoleId, PermissionKey[]>> | null {
    if (!m || Object.keys(m).length === 0) {
      return null;
    }
    const items = this.rolesStore.items();
    if (items.length === 0) {
      return m;
    }
    const allowed = new Set(items.map((r) => r.id));
    const out: Partial<Record<RoleId, PermissionKey[]>> = {};
    for (const [id, keys] of Object.entries(m)) {
      if (!allowed.has(id)) {
        continue;
      }
      const next = stripDictHubKeysIfNoPageSection(keys ?? []);
      out[id as RoleId] = next;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  private readRoleFromStorage(): RoleId {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY_ROLE) ?? sessionStorage.getItem(STORAGE_KEY_ROLE);
      if (!raw) {
        // Канон: одна роль по умолчанию — администратор (полный доступ в UI до загрузки JWT/ролей).
        return this.systemRoleIds.admin;
      }
      return normalizeMatrixRoleKey(raw) as RoleId;
    } catch {
      // no-op for restricted environments
    }
    return this.systemRoleIds.admin;
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
    const pruned = this.pruneMatrixToKnownRoles(cleaned);
    const final = pruned ?? {};
    if (Object.keys(final).length === 0) {
      this.resetAllMatrixOverrides();
      return;
    }
    this.matrixOverrideSignal.set(final);
    try {
      localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(final));
    } catch {
      // no-op
    }
    this.matrixBumpSignal.update((n) => n + 1);
    this.scheduleMatrixServerPersist();
  }
}

