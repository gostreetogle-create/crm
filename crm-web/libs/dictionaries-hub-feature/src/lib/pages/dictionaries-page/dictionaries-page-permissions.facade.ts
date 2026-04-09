import { Injectable, inject } from '@angular/core';
import { PermissionsService } from '@srm/authz-runtime';
import { permissionKeyForDictionaryHubTile, type PermissionKey } from '@srm/authz-core';

@Injectable({ providedIn: 'root' })
export class DictionariesPagePermissionsFacade {
  private readonly permissions = inject(PermissionsService);

  canCreate(): boolean {
    return this.permissions.crud().canCreate;
  }

  canEdit(): boolean {
    return this.permissions.crud().canEdit;
  }

  canDelete(): boolean {
    return this.permissions.crud().canDelete;
  }

  canDuplicate(): boolean {
    return this.permissions.can('crud.duplicate');
  }

  canPage(key: PermissionKey): boolean {
    return this.permissions.can(key);
  }

  canHubTile(tileKey: string): boolean {
    return this.permissions.can(permissionKeyForDictionaryHubTile(tileKey));
  }

  canStandaloneMode(mode: 'create' | 'edit' | 'copy'): boolean {
    if (mode === 'create') return this.canCreate();
    if (mode === 'edit') return this.canEdit();
    return this.canDuplicate();
  }
}
