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
  ProductionDetails: 'Детали',
  Products: 'Изделия',
};

/** Текст для копирования в чат с ИИ: как заполнять единый Excel под импорт в CRM. */
const AI_UNIFIED_EXCEL_FILL_PROMPT = `Ты помогаешь заполнить единый Excel для импорта справочников в CRM. Цель — минимум ошибок при импорте: не выдумывай данные, копируй структуру шаблона и UUID из того же файла.

ОБЯЗАТЕЛЬНО ПРО ШАБЛОН И ВКЛАДКИ
1) Бери только файл-шаблон из CRM («Скачать шаблон») или полный экспорт («Экспортировать данные»). Первая строка каждого листа — заголовки; названия колонок не менять.
2) Не удаляй и не переименовывай листы. Должны остаться все вкладки с русскими именами, в том числе «Изделия». Если какой-то лист пропал — скачай шаблон заново (иначе импорт сообщит об отсутствующей вкладке; в отчёте может фигурировать внутреннее имя вроде Products — это как раз лист «Изделия»).
3) Не объединяй книгу с другими файлами и не сохраняй «только нужные листы» — теряются зависимые вкладки и связи.

ПОРЯДОК ЗАПОЛНЕНИЯ (чтобы не сыпались ошибки на «Материалах»)
1) Единицы — у каждой новой строки заполнен «Код» (≥ 2 символов).
2) Геометрии — сначала приведи этот лист в порядок: без валидных строк геометрий материалы не смогут сослаться на «Название геометрии» или UUID.
3) Характеристики материалов — строки, на которые будут ссылаться материалы.
4) Материалы — только после п.1–3. Надёжнее всего: подставить в «ID характеристики» и «ID геометрии» UUID из колонок «ID» тех же листов в этом же файле (скопировать из строк выше). Названия по тексту должны совпадать с листами посимвольно (регистр/пробелы), иначе связь не найдётся.
5) В каждой строке материала одновременно: «Название»; характеристика (ID или код/название из листа «Характеристики материалов»); геометрия (ID или название с листа «Геометрии»); «ID единицы» или «Код ЕИ»; «Цена ₽» — число ≥ 1. Пустые и «полупустые» строки внизу листа убери.

ЕДИНИЦЫ ИЗМЕРЕНИЯ
• «Код» — не короче 2 символов; пустой или один символ = ошибка.

РОЛИ И ПОЛЬЗОВАТЕЛИ
• Роли: код латиницей по шаблону (≥ 2 символа, формат как в CRM). Код «admin» зарезервирован — для новой роли другой код.
• Пользователи: «Код роли» существует в листе «Роли». Пароль для новой записи ≥ 4 символов; при обновлении допустим пустой / маска из экспорта.

ТИПЫ РАБОТ
• Колонка «Ставка руб/ч» — число ≥ 1, не текст и не пусто.

ГЕОМЕТРИИ
• «Тип» — только одно из: rectangular, cylindrical, tube, plate, custom (не русские слова).
• «Параметры» — не пустые; формат строго как в шаблоне CRM (скопируй с пустого шаблона или с успешного экспорта). Иначе: «Параметры не распознаны».

ОТДЕЛКИ ПОВЕРХНОСТЕЙ И ПОКРЫТИЯ
• Отделки: «Тип финиша», «Шероховатость» заполнены; «Ra, мкм» — число (обязательно в строках с данными).
• Покрытия: «Тип покрытия», «Спецификация»; «Толщина, мкм» — число в каждой заполненной строке.

ЦВЕТА (если заполняешь лист)
• «HEX» и «RGB» в формате из шаблона; без них строка не пройдёт.

МАТЕРИАЛЫ (повтор)
• Лучший способ — UUID «ID характеристики» и «ID геометрии» из текущего файла. Если опираешься на названия — они должны быть у импортированных активных строк на соответствующих листах.
• «Код» материала желателен для повторного импорта без дубликатов.

ФОТО КП
• Полный набор полей по шаблону; неполные строки импорт пропустит без ошибки.

ИЗДЕЛИЯ (лист «Изделия»)
• Не удаляй лист. Строки без «ID детали» пропускаются; наименование изделия и ссылки — по шаблону.

ОТЧЁТ ИМПОРТА
• Сначала исправь листы-источники (Единицы, Геометрии, …), затем снова «Материалы». Одна строка отчёта на строку Excel — читай текст ошибки целиком.

Сформируй данные строго по заголовкам шаблона: типы (числа, UUID, да/нет) не смешивать с текстом там, где нужно число.`;

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

  /** Промпт для вставки в чат с ИИ при подготовке Excel. */
  readonly aiFillPrompt = AI_UNIFIED_EXCEL_FILL_PROMPT;

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

  async copyAiPromptToClipboard(): Promise<void> {
    const text = this.aiFillPrompt;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        this.errorText.set('Не удалось скопировать промпт в буфер обмена.');
      }
    }
  }
}

