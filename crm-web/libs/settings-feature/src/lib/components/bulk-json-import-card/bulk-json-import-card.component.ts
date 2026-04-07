import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { permissionKeysForAuthzGroup, type PermissionKey } from '@srm/authz-core';
import { PermissionsService } from '@srm/authz-runtime';
import { BulkJsonAdminService } from '@srm/settings-core';
import { ContentCardComponent, UiButtonComponent, UiModal } from '@srm/ui-kit';
import {
  BULK_JSON_TARGETS,
  EMPTY_BULK_JSON,
  type BulkJsonTarget,
  type BulkJsonTargetId,
  bulkJsonTargetById,
} from './bulk-json-import-card.targets';
import { validateBulkDraftForTarget } from './bulk-json-import-card.validation';

@Component({
  selector: 'app-bulk-json-import-card',
  standalone: true,
  imports: [CommonModule, ContentCardComponent, UiButtonComponent, UiModal],
  templateUrl: './bulk-json-import-card.component.html',
  styleUrl: './bulk-json-import-card.component.scss',
})
export class BulkJsonImportCardComponent {
  private readonly api = inject(BulkJsonAdminService);
  private readonly permissions = inject(PermissionsService);

  private readonly bulkPermissionKeys = permissionKeysForAuthzGroup('bulk');
  private static readonly BULK_ALL_KEY = 'admin.bulk.all' satisfies PermissionKey;

  @ViewChild('jsonFile') private jsonFileInput?: ElementRef<HTMLInputElement>;

  readonly targets = BULK_JSON_TARGETS;

  readonly selectedId = signal<BulkJsonTargetId>('units');

  readonly currentTarget = computed(() => bulkJsonTargetById(this.selectedId()));

  readonly isPurgeAllConfirmOpen = signal(false);

  readonly purgeAllConfirmMessage = computed(() => {
    const t = this.currentTarget();
    return `Удалить ВСЕ строки в таблице «${t.label}»? Это действие необратимо.`;
  });

  /** Любое право из группы «Массовый ввод (JSON)» — кнопки и локальные шаги. */
  readonly canUseBulkEditor = computed(() => this.permissions.hasAny([...this.bulkPermissionKeys]));

  /** Массовая запись / экспорт / purge для сегмента: ключ таблицы или мастер-ключ `admin.bulk.all`. */
  private canBulkWriteForTarget(t: BulkJsonTarget): boolean {
    if (!t.hasEndpoint || !t.submitPermission || !t.apiSegment) {
      return false;
    }
    return (
      this.permissions.can(BulkJsonImportCardComponent.BULK_ALL_KEY) ||
      this.permissions.can(t.submitPermission)
    );
  }

  readonly canSubmit = computed(() => this.canBulkWriteForTarget(this.currentTarget()));

  /** Для шаблона: есть ли право на текущую таблицу (снимок / purge / сохранение). */
  readonly canBulkWriteCurrent = computed(() => this.canBulkWriteForTarget(this.currentTarget()));

  /** Удаление всех строк — те же права и эндпоинт, что у «Сохранить в БД». */
  readonly canPurgeAll = computed(() => this.canSubmit());

  /** Подсказка при наведении: почему кнопка недоступна или что произойдёт при нажатии. */
  readonly purgeButtonTitle = computed(() => {
    if (this.loadingPurge()) {
      return '';
    }
    const t = this.currentTarget();
    if (!t.hasEndpoint || !t.apiSegment) {
      return 'Для этой таблицы массовое удаление на сервере ещё не подключено.';
    }
    if (!this.canBulkWriteForTarget(t)) {
      return 'Нужно право на массовую запись для выбранной таблицы (конкретный admin.bulk.* или admin.bulk.all).';
    }
    return 'Удалить все строки этой таблицы в БД. Действие необратимо.';
  });

  /** Скачивание снимка с API — только при подключённом эндпоинте и праве на запись. */
  readonly canExportFromApi = computed(() => this.canSubmit());

  /** Видимое пояснение: не права, а отсутствие файла / проверки. */
  readonly validateDisabledHint = computed(() => {
    if (!this.canUseBulkEditor()) return null;
    if (this.loadedFileLabel()) return null;
    return 'Кнопка «Проверить» неактивна: JSON-файл ещё не загружен (это не «нет данных в БД»).';
  });

  readonly saveDisabledHint = computed(() => {
    if (!this.canUseBulkEditor()) return null;
    const t = this.currentTarget();
    if (!this.canBulkWriteForTarget(t)) return null;
    if (!this.loadedFileLabel()) return null;
    if (this.validatedOk()) return null;
    return 'Кнопка «Сохранить в БД» неактивна, пока не пройдена успешная проверка выше.';
  });

  /** Нет права на таблицу — кнопки снимка / удаления / сохранения выключены не из‑за пустой базы. */
  readonly bulkWritePermissionHint = computed(() => {
    if (!this.canUseBulkEditor()) return null;
    const t = this.currentTarget();
    if (!t.hasEndpoint) return null;
    if (this.canBulkWriteForTarget(t)) return null;
    return 'Нет права на массовую запись для этой таблицы: в матрице включите нужный ключ admin.bulk.* или admin.bulk.all. Пока так — кнопки «Скачать JSON» (снимок из БД), «Удалить данные» и «Сохранить в БД» неактивны — это ограничение прав, а не признак пустой базы.';
  });

  /** Эндпоинт не подключён. */
  readonly purgeEndpointHint = computed(() => {
    if (!this.canUseBulkEditor()) return null;
    const t = this.currentTarget();
    if (t.hasEndpoint && t.apiSegment) return null;
    return 'Кнопка «Удалить данные» неактивна: для этой таблицы массовое удаление на сервере ещё не подключено.';
  });

  /** Содержимое загруженного JSON в памяти (без поля ввода в UI). */
  private jsonDraft = EMPTY_BULK_JSON;
  /** Имя последнего выбранного файла — без загрузки проверка и отправка недоступны. */
  readonly loadedFileLabel = signal<string | null>(null);
  readonly statusText = signal('');
  readonly errorText = signal('');
  readonly lastResult = signal<string>('');
  readonly loading = signal(false);
  readonly loadingExport = signal(false);
  readonly loadingPurge = signal(false);
  readonly loadingTemplatePreview = signal(false);
  readonly templatePreviewText = signal<string>(`${EMPTY_BULK_JSON}\n`);
  readonly templatePreviewHint = signal<string>('');
  readonly dbRowsCount = signal<number | null>(null);
  /** Успешная локальная проверка — разрешает «Сохранить в БД». */
  readonly validatedOk = signal(false);

  constructor() {
    this.refreshTemplatePreview();
  }

  onTargetSelect(ev: Event): void {
    const raw = (ev.target as HTMLSelectElement).value;
    if (!BULK_JSON_TARGETS.some((t) => t.id === raw)) {
      return;
    }
    this.selectedId.set(raw);
    this.jsonDraft = EMPTY_BULK_JSON;
    this.loadedFileLabel.set(null);
    this.statusText.set('');
    this.errorText.set('');
    this.lastResult.set('');
    this.validatedOk.set(false);
    this.dbRowsCount.set(null);
    this.refreshTemplatePreview();
  }

  private refreshTemplatePreview(): void {
    const t = this.currentTarget();
    if (!this.canUseBulkEditor()) {
      this.templatePreviewText.set(`${EMPTY_BULK_JSON}\n`);
      this.templatePreviewHint.set('Нет прав на массовый JSON — показан базовый пустой шаблон.');
      this.dbRowsCount.set(null);
      return;
    }
    if (this.canExportFromApi() && t.apiSegment) {
      this.loadingTemplatePreview.set(true);
      this.api.exportBulk(t.apiSegment).subscribe({
        next: (data) => {
          this.loadingTemplatePreview.set(false);
          const count = Array.isArray(data?.items) ? data.items.length : null;
          this.dbRowsCount.set(count);
          this.templatePreviewText.set(`${JSON.stringify(data, null, 2)}\n`);
          this.templatePreviewHint.set(
            'Шаблон загружен с сервера для выбранной таблицы. Можете копировать и заполнять.',
          );
        },
        error: () => {
          this.loadingTemplatePreview.set(false);
          this.dbRowsCount.set(null);
          this.templatePreviewText.set(`${EMPTY_BULK_JSON}\n`);
          this.templatePreviewHint.set(
            'Не удалось загрузить шаблон с сервера — показан базовый шаблон { "items": [] }.',
          );
        },
      });
      return;
    }
    this.templatePreviewText.set(`${EMPTY_BULK_JSON}\n`);
    this.dbRowsCount.set(null);
    this.templatePreviewHint.set(
      t.hasEndpoint
        ? 'Нет права на снимок из БД для этой таблицы — показан базовый шаблон.'
        : 'Для этой таблицы endpoint ещё не подключён — показан базовый шаблон.',
    );
  }

  downloadJson(): void {
    if (!this.canUseBulkEditor()) return;
    const t = this.currentTarget();
    if (this.canExportFromApi() && t.apiSegment) {
      this.loadingExport.set(true);
      this.errorText.set('');
      this.statusText.set('');
      this.api.exportBulk(t.apiSegment).subscribe({
        next: (data) => {
          this.loadingExport.set(false);
          const text = `${JSON.stringify(data, null, 2)}\n`;
          this.triggerDownload(text, t.downloadFileName);
          const items = data && typeof data === 'object' && 'items' in data ? (data as { items: unknown }).items : null;
          const empty = Array.isArray(items) && items.length === 0;
          this.statusText.set(
            empty
              ? 'Сейчас в базе по этой таблице нет строк — в скачанном файле пустой массив items. Добавьте объекты в items и загрузите файл, когда будете готовы к импорту.'
              : 'Снимок скачан в формате импорта. Если в базе не было строк, в items один шаблон со всеми полями — заполните значения перед «Сохранить в БД». Иначе отредактируйте файл и загрузите кнопкой «Загрузить JSON».',
          );
        },
        error: (err: unknown) => {
          this.loadingExport.set(false);
          this.setHttpError(err);
        },
      });
      return;
    }
    const text = `${EMPTY_BULK_JSON.trim()}\n`;
    this.triggerDownload(text, t.downloadFileName);
    if (t.hasEndpoint && t.apiSegment) {
      this.statusText.set(
        'Скачан пустой шаблон — нет права на снимок из БД для этой таблицы (включите нужный admin.bulk.* или admin.bulk.all в матрице). Это не значит, что в базе нет строк.',
      );
    } else {
      this.statusText.set(
        'Для этой таблицы экспорт с сервера ещё не подключён — скачан пустой шаблон { "items": [] }.',
      );
    }
  }

  openJsonFilePicker(): void {
    if (!this.canUseBulkEditor()) return;
    this.jsonFileInput?.nativeElement.click();
  }

  onJsonFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      this.jsonDraft = text;
      this.loadedFileLabel.set(file.name);
      this.validatedOk.set(false);
      this.errorText.set('');
      this.lastResult.set('');
      this.statusText.set(`Загружен файл «${file.name}». Нажмите «Проверить», затем при успехе — «Сохранить в БД».`);
    };
    reader.onerror = () => {
      this.errorText.set('Не удалось прочитать файл.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  validate(): void {
    if (!this.canUseBulkEditor()) return;
    if (!this.loadedFileLabel()) {
      this.errorText.set('Сначала загрузите JSON-файл кнопкой «Загрузить JSON».');
      return;
    }
    this.errorText.set('');
    this.statusText.set('');
    this.lastResult.set('');
    this.validatedOk.set(false);
    let body: { items: unknown[] };
    try {
      body = JSON.parse(this.jsonDraft) as { items: unknown[] };
    } catch {
      this.errorText.set('Некорректный JSON.');
      return;
    }
    if (!body || typeof body !== 'object') {
      this.errorText.set('Ожидается объект с полем items.');
      return;
    }
    if (Array.isArray(body.items) && body.items.length === 0) {
      this.errorText.set('В файле нет данных: массив items пуст. Добавьте строки или скачайте снимок, когда в базе появятся записи.');
      return;
    }
    const hint = validateBulkDraftForTarget(this.selectedId(), body);
    if (hint) {
      this.errorText.set(hint);
      return;
    }
    this.validatedOk.set(true);
    this.statusText.set('Проверка пройдена. Можно нажать «Сохранить в БД» (нужны права на выбранную таблицу).');
  }

  openPurgeAllConfirm(): void {
    if (!this.canPurgeAll() || this.loadingPurge()) return;
    const t = this.currentTarget();
    if (!t.hasEndpoint || !t.apiSegment) return;
    this.isPurgeAllConfirmOpen.set(true);
  }

  cancelPurgeAllConfirm(): void {
    this.isPurgeAllConfirmOpen.set(false);
  }

  confirmPurgeAll(): void {
    if (!this.canPurgeAll() || this.loadingPurge()) {
      this.cancelPurgeAllConfirm();
      return;
    }
    const t = this.currentTarget();
    if (!t.hasEndpoint || !t.apiSegment) {
      this.cancelPurgeAllConfirm();
      return;
    }
    this.cancelPurgeAllConfirm();

    this.errorText.set('');
    this.statusText.set('');
    this.lastResult.set('');
    this.loadingPurge.set(true);
    this.api.purgeBulkAll(t.apiSegment).subscribe({
      next: (res) => {
        this.loadingPurge.set(false);
        this.statusText.set(
          res.deleted === 0
            ? 'Удалять было нечего: в таблице не осталось строк для удаления (или сработала защита, например якорная роль).'
            : `Удалено записей: ${res.deleted}.`,
        );
        this.lastResult.set(JSON.stringify(res, null, 2));
        this.validatedOk.set(false);
        this.loadedFileLabel.set(null);
        this.jsonDraft = EMPTY_BULK_JSON;
        this.refreshTemplatePreview();
      },
      error: (err: unknown) => {
        this.loadingPurge.set(false);
        this.setHttpError(err);
      },
    });
  }

  saveToDb(): void {
    if (!this.canSubmit() || this.loading() || !this.validatedOk()) return;
    const t = this.currentTarget();
    if (!t.hasEndpoint || !t.submitPermission || !t.apiSegment) return;

    this.errorText.set('');
    this.statusText.set('');
    this.lastResult.set('');
    let body: { items: unknown[] };
    try {
      body = JSON.parse(this.jsonDraft) as { items: unknown[] };
    } catch {
      this.errorText.set('Некорректный JSON.');
      this.validatedOk.set(false);
      return;
    }
    const hint = validateBulkDraftForTarget(this.selectedId(), body);
    if (hint) {
      this.errorText.set(hint);
      this.validatedOk.set(false);
      return;
    }

    this.loading.set(true);
    this.api.importBulk(t.apiSegment, body.items).subscribe({
      next: (res) => {
        this.loading.set(false);
        const created = res.created?.length ?? 0;
        const errN = res.errors?.length ?? 0;
        this.statusText.set(res.ok ? `Готово: создано ${created}.` : `Частично: создано ${created}, ошибок ${errN}.`);
        this.lastResult.set(JSON.stringify(res, null, 2));
        if (res.ok) {
          this.validatedOk.set(false);
          this.loadedFileLabel.set(null);
          this.jsonDraft = EMPTY_BULK_JSON;
          this.refreshTemplatePreview();
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.setHttpError(err);
        this.validatedOk.set(false);
      },
    });
  }

  private setHttpError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      let msg = '';
      if (typeof body === 'object' && body !== null) {
        const m = (body as { message?: unknown }).message;
        if (typeof m === 'string' && m.trim()) msg = m;
      }
      if (!msg) msg = err.message;
      this.errorText.set(msg || `HTTP ${err.status}`);
    } else {
      this.errorText.set('Запрос не выполнен.');
    }
  }

  private triggerDownload(text: string, fileName: string): void {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  }
}
