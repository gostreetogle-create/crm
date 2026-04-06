import { prisma } from "./prisma.js";
import {
  augmentAuthzMatrixImplicitHubKeys,
  sanitizeAuthzMatrixPayload,
} from "./authz-matrix-sanitize.js";
import { AUTHZ_PERMISSION_KEYS, AUTHZ_PERMISSION_KEY_SET } from "./authz-permission-keys.js";

const SETTING_KEY = "authz_matrix";

const DICT_HUB_KEYS = AUTHZ_PERMISSION_KEYS.filter((k) => k.startsWith("dict.hub.")) as readonly string[];

function defaultKeysByRoleCode(code: string | null | undefined): string[] {
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return [];
  if (c === "admin") return [...AUTHZ_PERMISSION_KEYS];
  if (c === "viewer") return ["page.dictionaries", ...DICT_HUB_KEYS];
  if (c === "director" || c === "editor" || c === "accountant") {
    return AUTHZ_PERMISSION_KEYS.filter((k) => k !== "page.admin.settings");
  }
  return [];
}

function stripDictHubIfNoPageDictionaries(keys: string[]): string[] {
  if (keys.includes("page.dictionaries")) return keys;
  return keys.filter((k) => !k.startsWith("dict.hub."));
}

/**
 * Эффективный набор ключей прав для `roleId` (как на фронте: матрица + дефолты по коду роли).
 * Суперадмин (`Role.isSystem`) — полный канонический список.
 */
export async function getEffectivePermissionKeysForRoleId(roleId: string): Promise<Set<string>> {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return new Set();
  }
  if (role.isSystem) {
    return new Set(AUTHZ_PERMISSION_KEYS);
  }

  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  const raw = row?.valueJson as unknown;
  const roleRows = await prisma.role.findMany({ select: { id: true } });
  const known = new Set(roleRows.map((r) => r.id));

  let effective: string[];

  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const sanitized = sanitizeAuthzMatrixPayload(raw as Record<string, string[]>, known);
    const augmented = augmentAuthzMatrixImplicitHubKeys(sanitized);
    if (Object.prototype.hasOwnProperty.call(augmented, roleId)) {
      effective = stripDictHubIfNoPageDictionaries([...augmented[roleId]]);
    } else {
      effective = defaultKeysByRoleCode(role.code);
    }
  } else {
    effective = defaultKeysByRoleCode(role.code);
  }

  /** Роль с кодом `admin` (не только системная): всегда не менее полного канона, даже если в матрице сохранён урезанный список. */
  if ((role.code ?? "").trim().toLowerCase() === "admin") {
    const fullAdmin = defaultKeysByRoleCode("admin");
    effective = [...new Set([...fullAdmin, ...effective])];
  }

  return new Set(effective.filter((k) => AUTHZ_PERMISSION_KEY_SET.has(k)));
}
