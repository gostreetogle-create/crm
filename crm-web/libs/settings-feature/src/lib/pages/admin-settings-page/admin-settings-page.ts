import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AUTHZ_MATRIX_UI_SECTIONS,
  PERMISSION_CATALOG,
  permissionKeysForAuthzGroup,
} from '@srm/authz-core';
import { PermissionsService } from '@srm/authz-runtime';
import { PermissionKey, RoleId } from '@srm/authz-core';
import { RoleItem } from '@srm/roles-data-access';
import { RolesStore } from '@srm/dictionaries-state';
import { ContentCardComponent, PageShellComponent, UiButtonComponent } from '@srm/ui-kit';
import { DbBackupsAdminCardComponent } from '../../components/db-backups-admin-card/db-backups-admin-card.component';
import { FIELD_RULES_CATALOG } from '@srm/settings-core';
import { FieldRuleRow } from '@srm/settings-core';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [
    PageShellComponent,
    ContentCardComponent,
    UiButtonComponent,
    RouterLink,
    DbBackupsAdminCardComponent,
  ],
  templateUrl: './admin-settings-page.html',
  styleUrl: './admin-settings-page.scss',
})
export class AdminSettingsPage {
  readonly permissions = inject(PermissionsService);
  readonly rolesStore = inject(RolesStore);
  readonly rules: readonly FieldRuleRow[] = FIELD_RULES_CATALOG;
  /** Суперадмин в матрице не показываем — у него всегда полный доступ. */
  readonly matrixRoles = computed(() =>
    this.rolesStore.matrixRoleColumns().filter((r) => !r.isSystem),
  );
  readonly matrixRev = computed(() => this.permissions.matrixBump());
  readonly matrixSections = AUTHZ_MATRIX_UI_SECTIONS.map((section) => ({
    ...section,
    keys: permissionKeysForAuthzGroup(section.group),
  }));

  permissionLabelRu(key: PermissionKey): string {
    return PERMISSION_CATALOG[key].labelRu;
  }

  roleLabel(role: RoleItem): string {
    return role.name;
  }

  roleColumnId(role: RoleItem): RoleId {
    return role.id;
  }

  canResetRoleColumn(role: RoleItem): boolean {
    return this.permissions.roleHasExplicitMatrixOverride(role.id);
  }

  onMatrixToggle(role: RoleItem, key: PermissionKey, ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.permissions.setMatrixPermission(role.id, key, input.checked);
  }

  resetRoleColumn(role: RoleItem): void {
    this.permissions.resetRoleMatrixToDefault(role.id);
  }

  resetAllMatrix(): void {
    this.permissions.resetAllMatrixOverrides();
  }
}




