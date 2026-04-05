import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideSettings } from '@lucide/angular';
import type { PermissionKey } from '@srm/authz-core';
import { PermissionsService } from '@srm/authz-runtime';
import { SessionAuthService } from '@srm/auth-session-angular';
import { API_CONFIG } from '@srm/platform-core';
import { catchError, map, of, switchMap, timer, timeout } from 'rxjs';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideSettings],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent implements AfterViewInit, OnDestroy {
  private readonly session = inject(SessionAuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  readonly permissions = inject(PermissionsService);

  private readonly shellRef = viewChild.required<ElementRef<HTMLElement>>('shell');
  private resizeObserver: ResizeObserver | null = null;

  /** `true` — ответил `/api/health`; иначе недоступен или ещё не проверяли. */
  readonly serverOnline = signal<boolean | null>(null);

  /** Для шаблона: проверка ключа страницы без дублирования строк. */
  canPage(key: PermissionKey): boolean {
    return this.permissions.can(key);
  }

  constructor() {
    const url = this.healthUrl();
    timer(0, 15_000)
      .pipe(
        switchMap(() =>
          this.http.get<{ ok?: boolean }>(url).pipe(
            timeout(5_000),
            map((r) => r?.ok === true),
            catchError(() => of(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ok) => this.serverOnline.set(ok));
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.shellRef().nativeElement;
    const root = document.documentElement;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty('--header-height', `${Math.ceil(h)}px`);
    };
    sync();
    this.resizeObserver = new ResizeObserver(() => sync());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    document.documentElement.style.removeProperty('--header-height');
  }

  private healthUrl(): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/health`;
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }

  dismissMatrixSyncError(): void {
    this.permissions.clearMatrixSyncError();
  }
}



