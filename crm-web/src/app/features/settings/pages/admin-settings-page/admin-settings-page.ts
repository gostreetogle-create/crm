import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AUTHZ_MATRIX_UI_SECTIONS,
  PERMISSION_CATALOG,
  permissionKeysForAuthzGroup,
} from '../../../../core/auth/authz.catalog';
import { PermissionsService } from '../../../../core/auth/public-api';
import { PermissionKey, RoleId } from '../../../../core/auth/authz.types';
import { RoleItem } from '../../../roles/model/role-item';
import { RolesStore } from '../../../roles/state/roles.store';
import { ContentCardComponent } from '../../../../shared/ui/cards/public-api';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { FIELD_RULES_CATALOG } from '../../data/field-rules.catalog';
import { FieldRuleRow } from '../../model/field-rule-row';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [PageShellComponent, ContentCardComponent, UiButtonComponent, RouterLink],
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
