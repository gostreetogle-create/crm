import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/** Колонка мини-таблицы в стиле спецификации (переиспользуемый шаблон). */
export type UiSpecTableColumn = {
  key: string;
  label: string;
  /** Акцент текста в ячейке. */
  tone?: 'default' | 'emphasis' | 'muted';
  /** Выравнивание. */
  align?: 'start' | 'center' | 'end';
};

/**
 * Компактная таблица в духе спецификации: шапка, границы, колонка «№».
 * Для вложения в раскрывающиеся строки CRUD, карточки, отчёты.
 */
@Component({
  selector: 'app-ui-spec-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-spec-table.component.html',
  styleUrl: './ui-spec-table.component.scss',
  host: { class: 'uiSpecTableHost' },
})
export class UiSpecTableComponent {
  /** Заголовок блока (например «Состав изделия»). */
  @Input() caption = '';
  @Input() columns: UiSpecTableColumn[] = [];
  @Input() rows: Array<Record<string, unknown>> = [];
  @Input() emptyText = 'Нет данных.';
  /** Добавить колонку «№» с 1…n. */
  @Input() showOrdinalColumn = false;
  /** `embed` — без внешних отступов, на всю ширину родителя (раскрытие строки). */
  @Input() variant: 'embed' | 'standalone' = 'embed';

  formatCell(value: unknown): string {
    if (value == null) return '—';
    const s = String(value).trim();
    return s.length ? s : '—';
  }

  thClass(col: UiSpecTableColumn): string {
    const align = col.align ?? 'start';
    const base = 'uiSpecTable__th';
    return `${base} uiSpecTable__th--align-${align}`;
  }

  tdClass(col: UiSpecTableColumn): string {
    const tone = col.tone ?? 'default';
    const align = col.align ?? 'start';
    return `uiSpecTable__td uiSpecTable__td--tone-${tone} uiSpecTable__td--align-${align}`;
  }
}
