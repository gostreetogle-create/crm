import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_CONFIG } from '@srm/platform-core';
import { catchError, map, of, switchMap, timer, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppHealthStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly serverOnline = signal<boolean | null>(null);

  constructor() {
    const url = this.endpoint();
    timer(0, 15_000)
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          return this.http.get<{ ok?: boolean }>(url).pipe(
            timeout(5_000),
            map((r) => r?.ok === true),
            catchError(() => of(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ok) => {
        this.loading.set(false);
        this.serverOnline.set(ok);
        this.error.set(ok ? null : 'Сервер недоступен');
      });
  }

  private endpoint(): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/health`;
  }
}
