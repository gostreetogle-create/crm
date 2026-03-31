import { PermissionKey } from './authz.types';

/** Ключ плитки хаба `dictionaries-page` → ключ права `dict.hub.*`. */
const TILE_TO_PERMISSION: Readonly<Record<string, PermissionKey>> = {
  materials: 'dict.hub.materials',
  materialCharacteristics: 'dict.hub.material_characteristics',
  workTypes: 'dict.hub.work_types',
  units: 'dict.hub.units',
  clients: 'dict.hub.clients',
  organizations: 'dict.hub.organizations',
  colors: 'dict.hub.colors',
  surfaceFinishes: 'dict.hub.surface_finishes',
  geometries: 'dict.hub.geometries',
  coatings: 'dict.hub.coatings',
  roles: 'dict.hub.roles',
  users: 'dict.hub.users',
};

export function permissionKeyForDictionaryHubTile(tileKey: string): PermissionKey {
  return TILE_TO_PERMISSION[tileKey] ?? 'page.dictionaries';
}

/** Все ключи доступа к плиткам (для канона и валидатора матрицы). */
export const DICTIONARY_HUB_PERMISSION_KEYS: readonly PermissionKey[] = [
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
];
