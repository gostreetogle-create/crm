/**
 * Список ключей прав UI — должен совпадать с `PERMISSION_KEYS_ORDERED` / `PermissionKey` на фронте (`@srm/authz-core`).
 * Используется для валидации тела PUT `/api/authz-matrix`.
 */
export const AUTHZ_PERMISSION_KEYS = [
  'page.dictionaries',
  'page.demo',
  'page.commercialProposal',
  'page.preferences',
  'page.admin.settings',
  'dict.hub.materials',
  'dict.hub.material_characteristics',
  'dict.hub.work_types',
  'dict.hub.units',
  'dict.hub.clients',
  'dict.hub.organizations',
  'dict.hub.colors',
  'dict.hub.surface_finishes',
  'dict.hub.geometries',
  'dict.hub.coatings',
  'dict.hub.roles',
  'dict.hub.users',
  'dict.hub.kp_photos',
  'dict.hub.production_details',
  'dict.hub.products',
  'crud.create',
  'crud.edit',
  'crud.delete',
  'crud.duplicate',
  'admin.bulk.units',
] as const;

export const AUTHZ_PERMISSION_KEY_SET = new Set<string>(AUTHZ_PERMISSION_KEYS);
