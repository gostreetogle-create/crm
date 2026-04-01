import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideTrash2 } from '@lucide/angular';
import { UiButtonComponent } from '@srm/ui-kit';

/** Строка табличной части КП. */
export type KpLineItem = {
  name: string;
  qty: string;
  unit: string;
  price: string;
};

/** Слайс таблицы на одном листе A4. */
export type KpPageChunk = {
  lines: readonly KpLineItem[];
  /** Индекс первой строки в общем списке (для нумерации «№»). */
  globalStart: number;
  /** Первая страница — фон kp-1str, остальные — kp-2str. */
  useFirstBackground: boolean;
};

/** Фоны — только два PNG из `public/branding/kp/`. */
export const KP_PAGE1_BACKGROUND = '/branding/kp/kp-1str.png';
export const KP_PAGE2_BACKGROUND = '/branding/kp/kp-2str.png';

@Component({
  selector: 'app-kp-document-template',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, UiButtonComponent, LucideTrash2],
  templateUrl: './kp-document-template.component.html',
  styleUrl: './kp-document-template.component.scss',
})
export class KpDocumentTemplateComponent {
  readonly bgPage1 = KP_PAGE1_BACKGROUND;
  readonly bgPage2 = KP_PAGE2_BACKGROUND;

  /** Строки КП: редактирование и удаление в превью; в печати кнопки скрываются через `kp-no-print`. */
  @Input({ required: true }) linesForm!: FormArray;

  @Input() totalRub: number | null = null;
  @Input() showTotal = true;

  /** Отступ области таблицы от верха листа (под макет на PNG). */
  @Input() contentPaddingTop = '78mm';
  @Input() contentPaddingTopPage2 = '44mm';

  /**
   * Сколько строк таблицы помещается на одном листе; дальше — следующий лист (фон 2стр).
   * Не увеличивает высоту листа — только переносит строки.
   */
  @Input() rowsPerPage = 12;

  lineItemsValue(): KpLineItem[] {
    return (this.linesForm?.getRawValue() ?? []) as KpLineItem[];
  }

  lineGroupAt(index: number): FormGroup {
    return this.linesForm.at(index) as FormGroup;
  }

  removeLineAt(index: number): void {
    if (index < 0 || index >= this.linesForm.length) {
      return;
    }
    this.linesForm.removeAt(index);
  }

  private rowsPerPageEffective(): number {
    const n = Number(this.rowsPerPage);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 12;
  }

  /** Разбивка позиций по листам A4 без растягивания фона. */
  pageChunks(): KpPageChunk[] {
    const R = this.rowsPerPageEffective();
    const items = this.lineItemsValue();
    if (items.length === 0) {
      return [{ lines: [], globalStart: 0, useFirstBackground: true }];
    }
    const chunks: KpPageChunk[] = [];
    for (let i = 0; i < items.length; i += R) {
      chunks.push({
        lines: items.slice(i, i + R),
        globalStart: i,
        useFirstBackground: i === 0,
      });
    }
    return chunks;
  }

  parsePrice(raw: string): number {
    const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  parseQty(raw: string): number {
    const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  lineSum(line: KpLineItem): number {
    return this.parseQty(line.qty) * this.parsePrice(line.price);
  }

  /** Сумма по индексу строки — из актуального значения формы (живое обновление при вводе). */
  lineSumAt(index: number): number {
    const raw = this.lineGroupAt(index).getRawValue() as KpLineItem;
    return this.lineSum(raw);
  }

  computedTotal(): number {
    if (this.totalRub != null && Number.isFinite(this.totalRub)) {
      return this.totalRub;
    }
    return this.lineItemsValue().reduce((acc, line) => acc + this.lineSum(line), 0);
  }

  showTotalOnChunk(chunkIndex: number): boolean {
    if (!this.showTotal || !this.lineItemsValue().length) {
      return false;
    }
    return chunkIndex === this.pageChunks().length - 1;
  }

  /** Ссылки на глобальный индекс строки — для `@for`/`track` без обращения к `chunk` в track-выражении. */
  rowRefsForChunk(chunk: KpPageChunk): { idx: number }[] {
    return chunk.lines.map((_, i) => ({ idx: chunk.globalStart + i }));
  }
}
