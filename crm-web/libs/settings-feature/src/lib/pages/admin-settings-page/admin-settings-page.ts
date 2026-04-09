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
import { AdminSystemStatusCardComponent } from '../../components/admin-system-status-card/admin-system-status-card.component';
import { DbBackupsAdminCardComponent } from '../../components/db-backups-admin-card/db-backups-admin-card.component';
import { BulkJsonImportCardComponent } from '../../components/bulk-json-import-card/bulk-json-import-card.component';
import { FIELD_RULES_CATALOG } from '@srm/settings-core';
import { FieldRuleRow } from '@srm/settings-core';
import { AuthzDiagnosticsStore } from '../../state/authz-diagnostics.store';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [
    PageShellComponent,
    ContentCardComponent,
    UiButtonComponent,
    RouterLink,
    AdminSystemStatusCardComponent,
    DbBackupsAdminCardComponent,
    BulkJsonImportCardComponent,
  ],
  templateUrl: './admin-settings-page.html',
  styleUrl: './admin-settings-page.scss',
})
export class AdminSettingsPage {
  readonly permissions = inject(PermissionsService);
  readonly rolesStore = inject(RolesStore);
  private readonly authzDiagnosticsStore = inject(AuthzDiagnosticsStore);

  readonly diagnosticsJson = this.authzDiagnosticsStore.diagnosticsJson;
  readonly diagnosticsLoading = this.authzDiagnosticsStore.diagnosticsLoading;
  readonly diagnosticsError = this.authzDiagnosticsStore.diagnosticsError;
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

  /** Кнопка «снять все галочки» — есть что снимать. */
  canClearRoleColumn(role: RoleItem): boolean {
    return this.permissions.effectiveKeysForRole(role.id).length > 0;
  }

  /** Без раздела «Справочники» плитки хаба недоступны — чекбоксы dict.hub.* блокируем. */
  isDictHubCheckboxDisabled(role: RoleItem, key: PermissionKey): boolean {
    if (!key.startsWith('dict.hub.')) {
      return false;
    }
    return !this.permissions.hasPermissionForRole(role.id, 'page.dictionaries');
  }

  onMatrixToggle(role: RoleItem, key: PermissionKey, ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.permissions.setMatrixPermission(role.id, key, input.checked);
  }

  clearRoleColumnCheckboxes(role: RoleItem): void {
    this.permissions.clearAllMatrixPermissionsForRole(role.id);
  }

  resetAllMatrix(): void {
    this.permissions.resetAllMatrixOverrides();
  }

  async runDiagnostics(): Promise<void> {
    await this.authzDiagnosticsStore.runDiagnostics();
  }
}




