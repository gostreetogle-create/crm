import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ExcelDictionariesAdminService, type ExcelDictionariesImportReportDto } from '@srm/settings-core';
import { PermissionsService } from '@srm/authz-runtime';
import { ContentCardComponent, UiButtonComponent } from '@srm/ui-kit';

type SheetEntry = { sheetName: string; sheet: (ExcelDictionariesImportReportDto['sheets'])[string] };

const EXCEL_SHEET_DISPLAY_NAMES_RU: Readonly<Record<string, string>> = {
  Units: 'Единицы',
  Colors: 'Цвета',
  Roles: 'Роли',
  Users: 'Пользователи',
  WorkTypes: 'Типы работ',
  Geometries: 'Геометрии',
  SurfaceFinishes: 'Отделки поверхностей',
  Coatings: 'Покрытия',
  Clients: 'Клиенты',
  Organizations: 'Организации',
  KpPhotos: 'Фото КП',
  MaterialCharacteristics: 'Характеристики материалов',
  Materials: 'Материалы',
};

@Component({
  selector: 'app-excel-dictionaries-admin-card',
  standalone: true,
  imports: [CommonModule, ContentCardComponent, UiButtonComponent],
  templateUrl: './excel-dictionaries-admin-card.component.html',
  styleUrl: './excel-dictionaries-admin-card.component.scss',
})
export class ExcelDictionariesAdminCardComponent {
  private readonly api = inject(ExcelDictionariesAdminService);
  readonly permissions = inject(PermissionsService);

  readonly canTemplate = computed(() => this.permissions.can('excel.template'));
  readonly canExport = computed(() => this.permissions.can('excel.export'));
  readonly canImport = computed(() => this.permissions.can('excel.import'));

  readonly busy = signal(false);
  readonly errorText = signal<string | null>(null);
  readonly report = signal<ExcelDictionariesImportReportDto | null>(null);

  private formatDownloadError(err: unknown, fallbackPrefix: string): string {
    const e = err as { status?: unknown; error?: unknown } | null | undefined;
    const status = typeof e?.status === 'number' ? e.status : undefined;

    const errorPayload = e?.error as { error?: unknown; message?: unknown } | null | undefined;
    const errorCode =
      typeof errorPayload?.error === 'string'
        ? errorPayload.error
        : typeof errorPayload?.message === 'string'
          ? errorPayload.message
          : undefined;

    const base =
      status != null && errorCode
        ? `${fallbackPrefix} (HTTP ${status}: ${errorCode})`
        : status != null
          ? `${fallbackPrefix} (HTTP ${status})`
          : fallbackPrefix;

    return base;
  }

  readonly sheetEntries = computed<SheetEntry[]>(() => {
    const r = this.report();
    if (!r) return [];
    return Object.entries(r.sheets).map(([sheetKey, sheet]) => ({
      sheetName: EXCEL_SHEET_DISPLAY_NAMES_RU[sheetKey] ?? sheetKey,
      sheet,
    }));
  });

  private async downloadBlobIfXlsx(blob: Blob, filename: string): Promise<void> {
    // XLSX — zip-архив: первые байты всегда "PK".
    const buf = await blob.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isXlsx = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b;

    if (!isXlsx) {
      // Попробуем показать понятную причину вместо скачивания “битого” файла.
      const text = await blob.text().catch(() => '');
      let msg = 'Не удалось скачать Excel: файл не похож на .xlsx.';

      try {
        const json = JSON.parse(text) as unknown;
        if (json && typeof json === 'object') {
          const maybe = json as { message?: unknown; error?: unknown };
          if (typeof maybe.message === 'string' && maybe.message.trim()) {
            msg = `Не удалось скачать Excel: ${maybe.message.trim()}`;
          }
          if (typeof maybe.error === 'string' && maybe.error.trim()) {
            if (!maybe.message || (typeof maybe.message !== 'string' || !maybe.message.trim() || msg.endsWith('xlsx.'))) {
              msg = `Не удалось скачать Excel: ${maybe.error.trim()}`;
            }
          }
        } else if (text && text.trim()) {
          msg = `Не удалось скачать Excel: ${text.trim().slice(0, 300)}`;
        }
      } catch {
        if (text && text.trim()) {
          msg = `Не удалось скачать Excel: ${text.trim().slice(0, 300)}`;
        }
      }

      this.errorText.set(msg);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadTemplate(): void {
    if (!this.canTemplate()) return;
    this.errorText.set(null);
    this.report.set(null);
    this.busy.set(true);
    this.api.downloadTemplate().subscribe({
      next: (blob) => {
        void this.downloadBlobIfXlsx(blob, 'excel-dictionaries-template.xlsx');
      },
      error: (err) => this.errorText.set(this.formatDownloadError(err, 'Не удалось скачать шаблон Excel.')),
      complete: () => this.busy.set(false),
    });
  }

  downloadExport(): void {
    if (!this.canExport()) return;
    this.errorText.set(null);
    this.report.set(null);
    this.busy.set(true);
    this.api.downloadExport().subscribe({
      next: (blob) => {
        void this.downloadBlobIfXlsx(blob, 'excel-dictionaries-export.xlsx');
      },
      error: (err) => this.errorText.set(this.formatDownloadError(err, 'Не удалось скачать экспорт Excel.')),
      complete: () => this.busy.set(false),
    });
  }

  onFilePicked(ev: Event): void {
    if (!this.canImport()) return;
    const input = ev.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    this.errorText.set(null);
    this.report.set(null);
    this.busy.set(true);

    this.api.importExcel(file).subscribe({
      next: (r) => this.report.set(r),
      error: (err) =>
        this.errorText.set(
          err?.error?.message
            ? `Не удалось импортировать Excel: ${err.error.message}`
            : 'Не удалось импортировать Excel. Проверьте файл и повторите попытку.',
        ),
      complete: () => this.busy.set(false),
    });

    // allow selecting the same file again
    if (input) input.value = '';
  }

  formatRowMsg(excelRow: number, message: string): string {
    if (!excelRow) return message;
    return `стр. ${excelRow}: ${message}`;
  }
}

