import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { ClientItem } from '@srm/clients-data-access';
import { formatClientFio } from '@srm/clients-data-access';
import type { OrganizationItem } from '@srm/organizations-data-access';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { UiButtonComponent } from '@srm/ui-kit';
import {
  calcKpComputedTotal,
  calcKpLineSum,
  calcKpTotalPayable,
  effectiveRowsPerPage,
  backgroundImageCssUrl as backgroundImageCssUrlUtil,
  orderedRowIndicesWithPhotoFirst,
  normalizeKpImageSrcForDisplay,
  pageChunksFromOrderedRowIndices,
  parseKpNumber,
  parseKpRecipient,
  parseKpVatAmount,
  shouldShowPhotoColumn,
} from '../kp-utils';

/** Строка табличной части КП. */
export type KpLineItem = {
  name: string;
  qty: string;
  unit: string;
  price: string;
  /** URL картинки товара (https:// или путь с /); пусто — без фото. */
  imageUrl: string;
};

/** Слайс таблицы на одном листе A4. */
export type KpPageChunk = {
  /** Индексы строк в FormArray в порядке отображения (сначала с фото, затем без). */
  formIndices: readonly number[];
  /** Смещение для нумерации колонки «№» на этом листе. */
  displayOffset: number;
  /** Первая страница — `kp-1str.png`, продолжение — `kp-2str.png` (лежат в `public/branding/kp/`). */
  useFirstBackground: boolean;
};

/**
 * Фоны по умолчанию — файлы в репозитории: `kp-1str.png`, `kp-2str.png`.
 * Свой макет с другими именами (например `КП_СпортИН-ЮГ_стр1.png`): положите PNG в ту же папку
 * и замените путь здесь или переименуйте файлы под эти константы.
 */
export const KP_PAGE1_BACKGROUND = '/branding/kp/kp-1str.png';
export const KP_PAGE2_BACKGROUND = '/branding/kp/kp-2str.png';

/** Значение в `recipientCtrl`: организация. */
export const KP_RECIPIENT_ORG_PREFIX = 'org:';
/** Значение в `recipientCtrl`: контактное лицо. */
export const KP_RECIPIENT_CONTACT_PREFIX = 'contact:';

@Component({
  selector: 'app-kp-document-template',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, UiButtonComponent, LucidePlus, LucideTrash2],
  templateUrl: './kp-document-template.component.html',
  styleUrl: './kp-document-template.component.scss',
})
export class KpDocumentTemplateComponent {
  /** Добавить строку в таблицу КП (кнопка под таблицей в превью). */
  @Output() readonly addLineClick = new EventEmitter<void>();

  /** Строки КП: редактирование и удаление в превью; в печати кнопки скрываются через `kp-no-print`. */
  @Input({ required: true }) linesForm!: FormArray;

  /** Справочник организаций и контактов; один выпадающий список с группами. */
  @Input() organizations: readonly OrganizationItem[] = [];
  @Input() clients: readonly ClientItem[] = [];
  /**
   * Получатель: `org:<id>` или `contact:<id>` (либо организация, либо контакт).
   */
  @Input() recipientCtrl: FormControl<string> | null = null;
  /** Один контакт организации для блока «Контакт:» в КП (если у организации несколько контактов). */
  @Input() organizationContactIdCtrl: FormControl<string> | null = null;

  /** НДС под итогом: ставка % и сумма (редактируемые). */
  @Input() vatPercentCtrl: FormControl<string> | null = null;
  @Input() vatAmountCtrl: FormControl<string> | null = null;

  @Input() totalRub: number | null = null;
  @Input() showTotal = true;

  /** Отступ области таблицы от верха листа (под макет на PNG). */
  @Input() contentPaddingTop = '65mm';
  @Input() contentPaddingTopPage2 = '44mm';

  /**
   * Сколько строк таблицы помещается на одном листе; дальше — следующий лист (фон 2стр).
   * Поле ввода — слева от кнопки «+» под таблицей (без подписи в макете).
   */
  @Input() rowsPerPageCtrl: FormControl<string> | null = null;

  lineItemsValue(): KpLineItem[] {
    return (this.linesForm?.getRawValue() ?? []) as KpLineItem[];
  }

  resolvedBgPage1(): string {
    return KP_PAGE1_BACKGROUND;
  }

  resolvedBgPage2(): string {
    return KP_PAGE2_BACKGROUND;
  }

  /** CSS `url("...")` с кавычками — нужно для `data:` и `blob:`. */
  backgroundImageCssUrl(href: string): string {
    return backgroundImageCssUrlUtil(href);
  }

  /**
   * Разбор `recipientCtrl`: префиксы `org:` / `contact:` или устаревшее значение = id организации.
   */
  private parseRecipient():
    | { type: 'org'; id: string }
    | { type: 'contact'; id: string }
    | null {
    return parseKpRecipient(
      String(this.recipientCtrl?.value ?? '').trim(),
      this.organizations,
      KP_RECIPIENT_ORG_PREFIX,
      KP_RECIPIENT_CONTACT_PREFIX,
    );
  }

  /** Текущая организация, если в списке выбрана именно она. */
  selectedOrganization(): OrganizationItem | null {
    const p = this.parseRecipient();
    if (!p || p.type !== 'org') {
      return null;
    }
    return this.organizations.find((o) => o.id === p.id) ?? null;
  }

  clientLabel(c: ClientItem): string {
    return formatClientFio(c);
  }

  /** Выбранное контактное лицо (отдельно от организации). */
  selectedContact(): ClientItem | null {
    const p = this.parseRecipient();
    if (!p || p.type !== 'contact') {
      return null;
    }
    return this.clients.find((c) => c.id === p.id) ?? null;
  }

  /** Выбранный в списке контакт организации для вывода в КП. */
  selectedOrganizationContact(): ClientItem | null {
    const org = this.selectedOrganization();
    const ctrl = this.organizationContactIdCtrl;
    if (!org || !ctrl) {
      return null;
    }
    const id = String(ctrl.value ?? '').trim();
    if (!id || !org.contactIds.includes(id)) {
      return null;
    }
    return this.clients.find((c) => c.id === id) ?? null;
  }

  /** Индексы FormArray в порядке вывода: сначала строки с непустым imageUrl, затем остальные (стабильный порядок внутри групп). */
  orderedRowIndices(): number[] {
    const n = this.linesForm?.length ?? 0;
    return orderedRowIndicesWithPhotoFirst(n, (i) => this.imageUrlTrimmed(i).length > 0);
  }

  imageUrlTrimmed(index: number): string {
    return String(this.lineGroupAt(index).get('imageUrl')?.value ?? '').trim();
  }

  /** Показ превью: только http(s) или абсолютный путь с /. */
  imageSrcForDisplay(index: number): string {
    const u = this.imageUrlTrimmed(index);
    return normalizeKpImageSrcForDisplay(u);
  }

  /** Колонка «Фото» — только если хотя бы у одной строки непустой URL (после ввода или из витрины). */
  showPhotoColumn(): boolean {
    const n = this.linesForm?.length ?? 0;
    return shouldShowPhotoColumn(n, (i) => this.imageUrlTrimmed(i).length > 0);
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
    return effectiveRowsPerPage(this.rowsPerPageCtrl?.value);
  }

  /** Разбивка позиций по листам A4 без растягивания фона (порядок строк — orderedRowIndices). */
  pageChunks(): KpPageChunk[] {
    const R = this.rowsPerPageEffective();
    return pageChunksFromOrderedRowIndices(this.orderedRowIndices(), R);
  }

  parsePrice(raw: string): number {
    return parseKpNumber(raw);
  }

  parseQty(raw: string): number {
    return parseKpNumber(raw);
  }

  lineSum(line: KpLineItem): number {
    return calcKpLineSum(line);
  }

  /** Сумма по индексу строки — из актуального значения формы (живое обновление при вводе). */
  lineSumAt(index: number): number {
    const raw = this.lineGroupAt(index).getRawValue() as KpLineItem;
    return this.lineSum(raw);
  }

  computedTotal(): number {
    return calcKpComputedTotal(this.totalRub, this.lineItemsValue());
  }

  /** Сумма НДС из поля (число). */
  parsedVatAmount(): number {
    return parseKpVatAmount(this.vatAmountCtrl?.value);
  }

  /** Всего к оплате: итог по таблице + НДС. */
  totalPayable(): number {
    return calcKpTotalPayable(this.computedTotal(), this.parsedVatAmount());
  }

  showTotalOnChunk(chunkIndex: number): boolean {
    if (!this.showTotal || !this.lineItemsValue().length) {
      return false;
    }
    return chunkIndex === this.pageChunks().length - 1;
  }

  /** Есть следующий лист с позициями таблицы — подсказка под таблицей. */
  showTableContinuationHint(chunkIndex: number): boolean {
    const chunks = this.pageChunks();
    return chunks.length > 1 && chunkIndex < chunks.length - 1;
  }

  /** Номер листа, на котором продолжение (для подписи «на стр. N»). */
  continuationSheetNumber(chunkIndex: number): number {
    return chunkIndex + 2;
  }

  /** Сколько листов в превью/печати КП (чанков таблицы). */
  totalKpPages(): number {
    return this.pageChunks().length;
  }

  /** Ссылки на индекс в FormArray для строк слайса. */
  rowRefsForChunk(chunk: KpPageChunk): { idx: number }[] {
    return chunk.formIndices.map((idx) => ({ idx }));
  }
}
