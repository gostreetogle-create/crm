import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionsService } from '@srm/authz-runtime';
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

  /** Назначать роли сотрудникам — в справочнике на хабе. */
  readonly canOpenUsersHub = computed(() => this.permissions.can('dict.hub.users'));

  /** Матрица прав по ролям. */
  readonly canOpenAdminSettings = computed(() => this.permissions.can('page.admin.settings'));
}
