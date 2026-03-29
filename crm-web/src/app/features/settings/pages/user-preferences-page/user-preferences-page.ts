import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_CONFIG } from '../../../../core/api/api-config';
import { PermissionsService } from '../../../../core/auth/public-api';
import { RolesStore } from '../../../roles/state/roles.store';
import { ContentCardComponent } from '../../../../shared/ui/cards/public-api';
import { PageShellComponent } from '../../../../shared/ui/page-shell/page-shell.component';
import { ThemePickerComponent } from '../../../../shared/ui/theme-picker/theme-picker.component';

@Component({
  selector: 'app-user-preferences-page',
  standalone: true,
  imports: [PageShellComponent, ContentCardComponent, ThemePickerComponent, RouterLink],
  templateUrl: './user-preferences-page.html',
  styleUrl: './user-preferences-page.scss',
})
export class UserPreferencesPage {
  readonly permissions = inject(PermissionsService);
  readonly rolesStore = inject(RolesStore);
  readonly api = inject(API_CONFIG);

  /** Назначать роли сотрудникам — в справочнике на хабе. */
  readonly canOpenUsersHub = computed(() => this.permissions.can('dict.hub.users'));

  /** Матрица прав по ролям. */
  readonly canOpenAdminSettings = computed(() => this.permissions.can('page.admin.settings'));

  /**
   * Активные роли в порядке sortOrder; если текущая сессия указывает на роль вне списка (например, деактивирована),
   * она добавляется сверху, чтобы выпадающий список не «ломался».
   */
  readonly roleOptions = computed(() => {
    const cols = [...this.rolesStore.matrixRoleColumns()];
    const currentId = this.permissions.role();
    if (cols.some((r) => r.id === currentId)) {
      return cols.map((r) => ({
        id: r.id,
        label: r.name,
      }));
    }
    const cur = this.rolesStore.roleById(currentId);
    if (cur) {
      return [
        {
          id: cur.id,
          label: cur.isActive ? cur.name : `${cur.name} (неактивна)`,
        },
        ...cols.map((r) => ({ id: r.id, label: r.name })),
      ];
    }
    return cols.map((r) => ({ id: r.id, label: r.name }));
  });

  onRoleChange(value: string): void {
    this.permissions.setRole(value);
  }
}
