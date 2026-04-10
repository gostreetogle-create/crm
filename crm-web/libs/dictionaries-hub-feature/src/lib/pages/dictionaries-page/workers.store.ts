import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { finalize } from 'rxjs';

export type WorkerItem = {
  id: string;
  name: string;
  role: string | null;
  isActive: boolean;
};

@Injectable()
export class WorkersStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly workers = signal<WorkerItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly workersData = computed(() =>
    this.workers().map((w) => ({
      id: w.id,
      hubLine: w.role?.trim() ? `${w.name} · ${w.role}` : w.name,
      name: w.name,
      roleLabel: w.role?.trim() ? w.role : '—',
    })),
  );

  loadWorkers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<WorkerItem[]>(this.endpoint('/api/workers'))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.workers.set(Array.isArray(rows) ? rows : []),
        error: () => {
          this.workers.set([]);
          this.error.set('Не удалось загрузить рабочих');
        },
      });
  }

  createWorker(name: string, role?: string | null): void {
    const n = name.trim();
    if (!n) return;
    this.loading.set(true);
    this.error.set(null);
    const body: { name: string; role?: string } = { name: n };
    const r = role?.trim();
    if (r) body.role = r;
    this.http.post<WorkerItem>(this.endpoint('/api/workers'), body).subscribe({
      next: () => this.loadWorkers(),
      error: () => {
        this.error.set('Не удалось добавить рабочего');
        this.loading.set(false);
      },
    });
  }

  deleteWorker(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.delete(this.endpoint(`/api/workers/${id}`)).subscribe({
      next: () => this.loadWorkers(),
      error: () => {
        this.error.set('Не удалось удалить рабочего');
        this.loading.set(false);
      },
    });
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
