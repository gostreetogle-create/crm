export type UserRole = 'admin' | 'editor' | 'viewer';

export type PermissionKey =
  | 'crud.create'
  | 'crud.edit'
  | 'crud.delete'
  | 'crud.duplicate'
  | 'excel.template'
  | 'excel.import'
  | 'excel.export';

export type CrudPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
};

