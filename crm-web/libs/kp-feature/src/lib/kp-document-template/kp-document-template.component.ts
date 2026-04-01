import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { ClientItem } from '@srm/clients-data-access';
import { formatClientFio } from '@srm/clients-data-access';
import type { OrganizationItem } from '@srm/organizations-data-access';
import { LucideTrash2 } from '@lucide/angular';
import { UiButtonComponent } from '@srm/ui-kit';

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
  /** Первая страница — фон kp-1str, остальные — kp-2str. */
  useFirstBackground: boolean;
};

/** Фоны — только два PNG из `public/branding/kp/`. */
export const KP_PAGE1_BACKGROUND = '/branding/kp/kp-1str.png';
export const KP_PAGE2_BACKGROUND = '/branding/kp/kp-2str.png';

/** Значение в `recipientCtrl`: организация. */
export const KP_RECIPIENT_ORG_PREFIX = 'org:';
/** Значение в `recipientCtrl`: контактное лицо. */
export const KP_RECIPIENT_CONTACT_PREFIX = 'contact:';

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

  /** Выпадающая панель с поиском (комбобокс вместо нативного select). */
  readonly recipientPanelOpen = signal(false);

  @ViewChild('recipientCombo', { read: ElementRef }) private recipientComboRef?: ElementRef<HTMLElement>;

  /** Строки КП: редактирование и удаление в превью; в печати кнопки скрываются через `kp-no-print`. */
  @Input({ required: true }) linesForm!: FormArray;

  /** Справочник организаций и контактов; один выпадающий список с группами. */
  @Input() organizations: readonly OrganizationItem[] = [];
  @Input() clients: readonly ClientItem[] = [];
  /**
   * Получатель: `org:<id>` или `contact:<id>` (либо организация, либо контакт).
   */
  @Input() recipientCtrl: FormControl<string> | null = null;
  /** Фильтр по названию / ФИО / телефону / email для пунктов списка. */
  @Input() organizationSearchCtrl: FormControl<string> | null = null;
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
   * Не увеличивает высоту листа — только переносит строки.
   */
  @Input() rowsPerPage = 12;

  lineItemsValue(): KpLineItem[] {
    return (this.linesForm?.getRawValue() ?? []) as KpLineItem[];
  }

  /** Подпись в списке: краткое наименование или полное. */
  organizationOptionLabel(org: OrganizationItem): string {
    const s = org.shortName?.trim();
    return s || org.name;
  }

  orgOptionValue(org: OrganizationItem): string {
    return `${KP_RECIPIENT_ORG_PREFIX}${org.id}`;
  }

  clientOptionValue(c: ClientItem): string {
    return `${KP_RECIPIENT_CONTACT_PREFIX}${c.id}`;
  }

  /**
   * Разбор `recipientCtrl`: префиксы `org:` / `contact:` или устаревшее значение = id организации.
   */
  private parseRecipient():
    | { type: 'org'; id: string }
    | { type: 'contact'; id: string }
    | null {
    const raw = String(this.recipientCtrl?.value ?? '').trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith(KP_RECIPIENT_ORG_PREFIX)) {
      const id = raw.slice(KP_RECIPIENT_ORG_PREFIX.length).trim();
      return id ? { type: 'org', id } : null;
    }
    if (raw.startsWith(KP_RECIPIENT_CONTACT_PREFIX)) {
      const id = raw.slice(KP_RECIPIENT_CONTACT_PREFIX.length).trim();
      return id ? { type: 'contact', id } : null;
    }
    const legacyOrg = this.organizations.find((o) => o.id === raw);
    return legacyOrg ? { type: 'org', id: raw } : null;
  }

  /** Текущая организация, если в списке выбрана именно она. */
  selectedOrganization(): OrganizationItem | null {
    const p = this.parseRecipient();
    if (!p || p.type !== 'org') {
      return null;
    }
    return this.organizations.find((o) => o.id === p.id) ?? null;
  }

  /** Организации в группе списка с учётом поиска; выбранная не пропадает. */
  filteredOrganizations(): OrganizationItem[] {
    const q = (this.organizationSearchCtrl?.value ?? '').trim().toLowerCase();
    const list = this.organizations.filter((o) => o.isActive);
    const filtered = !q
      ? [...list]
      : list.filter(
          (o) =>
            o.name.toLowerCase().includes(q) || (o.shortName?.toLowerCase().includes(q) ?? false),
        );
    const sel = this.selectedOrganization();
    if (sel && q && !filtered.some((o) => o.id === sel.id)) {
      return [sel, ...filtered];
    }
    return filtered;
  }

  /** Контактные лица во второй группе списка; выбранный контакт не пропадает при фильтре. */
  filteredClients(): ClientItem[] {
    const q = (this.organizationSearchCtrl?.value ?? '').trim().toLowerCase();
    const list = this.clients.filter((c) => c.isActive);
    const match = (c: ClientItem) => {
      if (!q) {
        return true;
      }
      const fio = formatClientFio(c).toLowerCase();
      return (
        fio.includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        (c.address?.toLowerCase().includes(q) ?? false)
      );
    };
    let filtered = list.filter(match);
    const sel = this.selectedContact();
    if (sel && q && !filtered.some((c) => c.id === sel.id)) {
      filtered = [sel, ...filtered];
    }
    return filtered;
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

  /** Контакты, привязанные к организации в справочнике (порядок как в карточке). */
  contactsLinkedToOrganization(org: OrganizationItem): ClientItem[] {
    if (!org.contactIds?.length) {
      return [];
    }
    const byId = new Map(this.clients.map((c) => [c.id, c]));
    const out: ClientItem[] = [];
    for (const id of org.contactIds) {
      const c = byId.get(id);
      if (c?.isActive) {
        out.push(c);
      }
    }
    return out;
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

  /** Текст на кнопке комбобокса. */
  recipientDisplayLabel(): string {
    const org = this.selectedOrganization();
    if (org) {
      return this.organizationOptionLabel(org);
    }
    const c = this.selectedContact();
    if (c) {
      return this.clientLabel(c);
    }
    return '— не выбрано —';
  }

  toggleRecipientPanel(ev?: Event): void {
    ev?.stopPropagation();
    this.recipientPanelOpen.update((v) => !v);
  }

  pickRecipient(value: string, ev?: Event): void {
    ev?.stopPropagation();
    ev?.preventDefault();
    this.recipientCtrl?.setValue(value);
    this.recipientPanelOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.recipientPanelOpen()) {
      return;
    }
    const root = this.recipientComboRef?.nativeElement;
    if (!root) {
      return;
    }
    const t = ev.target;
    if (t instanceof Node && root.contains(t)) {
      return;
    }
    this.recipientPanelOpen.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.recipientPanelOpen()) {
      this.recipientPanelOpen.set(false);
    }
  }

  /** Индексы FormArray в порядке вывода: сначала строки с непустым imageUrl, затем остальные (стабильный порядок внутри групп). */
  orderedRowIndices(): number[] {
    const n = this.linesForm?.length ?? 0;
    const indices = Array.from({ length: n }, (_, i) => i);
    const hasImg = (i: number) => this.imageUrlTrimmed(i).length > 0;
    return indices.sort((a, b) => {
      const ha = hasImg(a);
      const hb = hasImg(b);
      if (ha !== hb) {
        return ha ? -1 : 1;
      }
      return a - b;
    });
  }

  imageUrlTrimmed(index: number): string {
    return String(this.lineGroupAt(index).get('imageUrl')?.value ?? '').trim();
  }

  /** Показ превью: только http(s) или абсолютный путь с /. */
  imageSrcForDisplay(index: number): string {
    const u = this.imageUrlTrimmed(index);
    if (!u) {
      return '';
    }
    if (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('/')) {
      return u;
    }
    return '';
  }

  /** Колонка «Фото» — только если хотя бы у одной строки непустой URL (после ввода или из витрины). */
  showPhotoColumn(): boolean {
    const n = this.linesForm?.length ?? 0;
    for (let i = 0; i < n; i++) {
      if (this.imageUrlTrimmed(i).length > 0) {
        return true;
      }
    }
    return false;
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

  /** Разбивка позиций по листам A4 без растягивания фона (порядок строк — orderedRowIndices). */
  pageChunks(): KpPageChunk[] {
    const R = this.rowsPerPageEffective();
    const order = this.orderedRowIndices();
    if (order.length === 0) {
      return [{ formIndices: [], displayOffset: 0, useFirstBackground: true }];
    }
    const chunks: KpPageChunk[] = [];
    for (let start = 0; start < order.length; start += R) {
      chunks.push({
        formIndices: order.slice(start, start + R),
        displayOffset: start,
        useFirstBackground: start === 0,
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

  /** Ссылки на индекс в FormArray для строк слайса. */
  rowRefsForChunk(chunk: KpPageChunk): { idx: number }[] {
    return chunk.formIndices.map((idx) => ({ idx }));
  }
}
