import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideSettings } from '@lucide/angular';
import { PermissionKey, PermissionsService, SessionAuthService } from '../../../core/auth/public-api';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideSettings],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  private readonly session = inject(SessionAuthService);
  private readonly router = inject(Router);
  readonly permissions = inject(PermissionsService);

  /** Для шаблона: проверка ключа страницы без дублирования строк. */
  canPage(key: PermissionKey): boolean {
    return this.permissions.can(key);
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }
}

