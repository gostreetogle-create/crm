/** Идентификатор роли из справочника (`RoleItem.id`), не путать с `code`. */
export type RoleId = string;

/** Ключи прав: страницы, плитки справочников, CRUD, массовый JSON (admin). */
export type PermissionKey =
  | 'page.dictionaries'
  | 'page.demo'
  | 'page.commercialProposal'
  | 'page.production'
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
  | 'admin.bulk.all'
  | 'admin.bulk.units'
  | 'admin.bulk.colors'
  | 'admin.bulk.surface_finishes'
  | 'admin.bulk.coatings'
  | 'admin.bulk.geometries'
  | 'admin.bulk.material_characteristics'
  | 'admin.bulk.materials'
  | 'admin.bulk.production_work_types'
  | 'admin.bulk.clients'
  | 'admin.bulk.organizations'
  | 'admin.bulk.kp_photos'
  | 'admin.bulk.users'
  | 'admin.bulk.production_details'
  | 'admin.bulk.manufactured_products'
  | 'admin.bulk.complexes'
  | 'admin.bulk.catalog_products'
  | 'admin.bulk.roles'
  | 'admin.bulk.trade_goods';

export type CrudPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
};
