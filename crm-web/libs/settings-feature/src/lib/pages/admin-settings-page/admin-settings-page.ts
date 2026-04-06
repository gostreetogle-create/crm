import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
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
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  readonly diagnosticsJson = signal<string | null>(null);
  readonly diagnosticsLoading = signal(false);
  readonly diagnosticsError = signal<string | null>(null);
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
    this.diagnosticsLoading.set(true);
    this.diagnosticsError.set(null);
    try {
      const base = this.apiConfig.baseUrl.replace(/\/$/, '');
      const res = await firstValueFrom(this.http.get<unknown>(`${base}/api/authz-matrix/diagnostics`));
      this.diagnosticsJson.set(JSON.stringify(res, null, 2));
    } catch (e: unknown) {
      this.diagnosticsError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.diagnosticsLoading.set(false);
    }
  }
}




