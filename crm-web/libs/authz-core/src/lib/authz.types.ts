/** Идентификатор роли из справочника (`RoleItem.id`), не путать с `code`. */
export type RoleId = string;

/** Ключи прав: страницы, плитки справочников, CRUD, массовый JSON (admin). */
export type PermissionKey =
  | 'page.dictionaries'
  | 'page.demo'
  | 'page.commercialProposal'
  | 'page.preferences'
  | 'page.admin.settings'
  | 'dict.hub.materials'
  | 'dict.hub.material_characteristics'
  | 'dict.hub.work_types'
  | 'dict.hub.units'
  | 'dict.hub.clients'
  | 'dict.hub.organizations'
  | 'dict.hub.colors'
  | 'dict.hub.surface_finishes'
  | 'dict.hub.geometries'
  | 'dict.hub.coatings'
  | 'dict.hub.roles'
  | 'dict.hub.users'
  | 'dict.hub.kp_photos'
  | 'dict.hub.production_details'
  | 'dict.hub.products'
  | 'dict.hub.trade_goods'
  | 'dict.hub.catalog_suite'
  | 'crud.create'
  | 'crud.edit'
  | 'crud.delete'
  | 'crud.duplicate'
  | 'admin.bulk.units';

export type CrudPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
};
