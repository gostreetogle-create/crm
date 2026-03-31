import type { StandaloneDictionaryCreateKey } from '../standalone-dictionary-create.meta';

/**
 * Единый реестр: «+» на плитке хаба → куда вести пользователя (полноэкранный материал/характеристика или standalone create).
 */
export type HubBoardQuickCreateTarget =
  | { kind: 'newMaterialPage' }
  | { kind: 'newMaterialCharacteristicPage' }
  | { kind: 'standalone'; key: StandaloneDictionaryCreateKey };

export const HUB_BOARD_QUICK_CREATE = {
  materials: { kind: 'newMaterialPage' },
  materialCharacteristics: { kind: 'newMaterialCharacteristicPage' },
  workTypes: { kind: 'standalone', key: 'workTypes' },
  units: { kind: 'standalone', key: 'units' },
  geometries: { kind: 'standalone', key: 'geometries' },
  colors: { kind: 'standalone', key: 'colors' },
  surfaceFinishes: { kind: 'standalone', key: 'surfaceFinishes' },
  coatings: { kind: 'standalone', key: 'coatings' },
  organizations: { kind: 'standalone', key: 'organizations' },
  clients: { kind: 'standalone', key: 'clients' },
  roles: { kind: 'standalone', key: 'roles' },
  users: { kind: 'standalone', key: 'users' },
} as const satisfies Record<string, HubBoardQuickCreateTarget>;

export type HubBoardQuickCreateKey = keyof typeof HUB_BOARD_QUICK_CREATE;

export function resolveHubBoardQuickCreate(key: string): HubBoardQuickCreateTarget | undefined {
  return HUB_BOARD_QUICK_CREATE[key as HubBoardQuickCreateKey];
}
