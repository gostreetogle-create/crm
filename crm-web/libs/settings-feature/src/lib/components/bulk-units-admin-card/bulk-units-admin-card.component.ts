import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionsService } from '@srm/authz-runtime';
import { BulkUnitsAdminService } from '@srm/settings-core';
import { ContentCardComponent, UiButtonComponent } from '@srm/ui-kit';

const EXAMPLE_JSON = `{
  "items": [
    { "name": "пог. м", "code": "m_run", "notes": "Погонный метр", "isActive": true },
    { "name": "шт", "code": "pcs", "isActive": true }
  ]
}`;

@Component({
  selector: 'app-bulk-units-admin-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentCardComponent, UiButtonComponent],
  templateUrl: './bulk-units-admin-card.component.html',
  styleUrl: './bulk-units-admin-card.component.scss',
})
export class BulkUnitsAdminCardComponent {
  private readonly api = inject(BulkUnitsAdminService);
  private readonly permissions = inject(PermissionsService);

  readonly canImport = computed(() => this.permissions.can('admin.bulk.units'));
  jsonDraft = EXAMPLE_JSON;
  readonly statusText = signal('');
  readonly errorText = signal('');
  readonly lastResult = signal<string>('');
  readonly loading = signal(false);

  useExample(): void {
    this.jsonDraft = EXAMPLE_JSON;
    this.statusText.set('');
    this.errorText.set('');
  }

  submit(): void {
    if (!this.canImport()) return;
    this.errorText.set('');
    this.statusText.set('');
    this.lastResult.set('');
    let body: { items: unknown[] };
    try {
      body = JSON.parse(this.jsonDraft) as { items: unknown[] };
    } catch {
      this.errorText.set('Некорректный JSON.');
      return;
    }
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      this.errorText.set('Ожидается объект с непустым массивом items.');
      return;
    }
    this.loading.set(true);
    this.api.importUnits(body.items as never).subscribe({
      next: (res) => {
        this.loading.set(false);
        const created = res.created?.length ?? 0;
        const errN = res.errors?.length ?? 0;
        this.statusText.set(res.ok ? `Готово: создано ${created}.` : `Частично: создано ${created}, ошибок ${errN}.`);
        this.lastResult.set(JSON.stringify(res, null, 2));
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse) {
          const msg =
            typeof err.error === 'object' && err.error && 'message' in err.error
              ? String((err.error as { message?: string }).message)
              : err.message;
          this.errorText.set(msg || `HTTP ${err.status}`);
        } else {
          this.errorText.set('Запрос не выполнен.');
        }
      },
    });
  }
}
