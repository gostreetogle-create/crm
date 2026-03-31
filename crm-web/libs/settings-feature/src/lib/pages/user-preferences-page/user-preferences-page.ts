import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionsService } from '@srm/authz-runtime';
import { SessionAuthService } from '@srm/auth-session-angular';
import { RolesStore } from '@srm/dictionaries-state';
import { ContentCardComponent, PageShellComponent, ThemePickerComponent } from '@srm/ui-kit';

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
  readonly session = inject(SessionAuthService);

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


