import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';

@Injectable({ providedIn: 'root' })
export class AuthzDiagnosticsStore {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  readonly diagnosticsJson = signal<string | null>(null);
  readonly diagnosticsLoading = signal(false);
  readonly diagnosticsError = signal<string | null>(null);

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
