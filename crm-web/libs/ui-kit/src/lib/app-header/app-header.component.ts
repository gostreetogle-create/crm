import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideArchive, LucideSettings } from '@lucide/angular';
import type { PermissionKey } from '@srm/authz-core';
import { PermissionsService } from '@srm/authz-runtime';
import { SessionAuthService } from '@srm/auth-session-angular';
import { AppHealthStore } from './app-health.store';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideArchive, LucideSettings],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent implements AfterViewInit, OnDestroy {
  private readonly session = inject(SessionAuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly permissions = inject(PermissionsService);
  private readonly appHealthStore = inject(AppHealthStore);

  private readonly shellRef = viewChild.required<ElementRef<HTMLElement>>('shell');
  private resizeObserver: ResizeObserver | null = null;

  /** `true` — ответил `/api/health`; иначе недоступен или ещё не проверяли. */
  readonly serverOnline = this.appHealthStore.serverOnline;

  /** Для шаблона: проверка ключа страницы без дублирования строк. */
  canPage(key: PermissionKey): boolean {
    return this.permissions.can(key);
  }

  constructor() {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.shellRef().nativeElement;
    const root = document.documentElement;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      const px = Math.ceil(h);
      /*
       * var(--header-height, fallback) не подставляет fallback, если свойство задано как 0px —
       * это валидное значение. При нулевой высоте до первого layout убираем свойство.
       */
      if (px < 1) {
        root.style.removeProperty('--header-height');
      } else {
        root.style.setProperty('--header-height', `${px}px`);
      }
    };
    sync();
    requestAnimationFrame(() => sync());
    this.resizeObserver = new ResizeObserver(() => sync());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    document.documentElement.style.removeProperty('--header-height');
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }

  dismissMatrixSyncError(): void {
    this.permissions.clearMatrixSyncError();
  }
}



