import { PermissionKey, UserRole } from './authz.types';

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlyArray<PermissionKey>> = {
  admin: [
    'crud.create',
    'crud.edit',
    'crud.delete',
    'crud.duplicate',
    'excel.template',
    'excel.import',
    'excel.export',
  ],
  editor: [
    'crud.create',
    'crud.edit',
    'crud.duplicate',
    'excel.template',
    'excel.import',
    'excel.export',
  ],
  viewer: [],
};

