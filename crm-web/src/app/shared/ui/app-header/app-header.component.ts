import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionAuthService } from '../../../core/auth/session-auth.service';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  private readonly session = inject(SessionAuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }
}

