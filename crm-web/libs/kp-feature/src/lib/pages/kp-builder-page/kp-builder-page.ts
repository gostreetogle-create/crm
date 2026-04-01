import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  NgZone,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CLIENTS_REPOSITORY, type ClientItem } from '@srm/clients-data-access';
import { ORGANIZATIONS_REPOSITORY, type OrganizationItem } from '@srm/organizations-data-access';
import { KP_RECIPIENT_ORG_PREFIX } from '../../kp-document-template/kp-document-template.component';
import { PageShellComponent, UiButtonComponent } from '@srm/ui-kit';
import { KpCatalogVitrineComponent } from '../../kp-catalog-vitrine/kp-catalog-vitrine.component';
import type { KpCatalogProduct } from '../../kp-catalog-vitrine/kp-catalog-product.model';
import {
  KpDocumentTemplateComponent,
  type KpLineItem,
} from '../../kp-document-template/kp-document-template.component';
import { KpRecipientToolbarComponent } from '../../kp-recipient-toolbar/kp-recipient-toolbar.component';
import { LucidePrinter } from '@lucide/angular';

@Component({
  selector: 'app-kp-builder-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageShellComponent,
    UiButtonComponent,
    KpCatalogVitrineComponent,
    KpDocumentTemplateComponent,
    KpRecipientToolbarComponent,
    LucidePrinter,
  ],
  templateUrl: './kp-builder-page.html',
  styleUrl: './kp-builder-page.scss',
})
export class KpBuilderPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ngZone = inject(NgZone);
  private readonly organizationsRepository = inject(ORGANIZATIONS_REPOSITORY);
  private readonly clientsRepository = inject(CLIENTS_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  /** Справочник организаций для выпадающего списка в шаблоне КП. */
  readonly organizations = signal<OrganizationItem[]>([]);

  /** Контактные лица (для выбора по организации). */
  readonly clients = signal<ClientItem[]>([]);

  @ViewChild('previewHost', { read: ElementRef }) previewHost?: ElementRef<HTMLElement>;

  private resizeObserver?: ResizeObserver;

  /**
   * Масштаб миниатюры КП под ширину колонки превью.
   * Лист A4 в шаблоне — 210mm; zoom = доступная ширина / 210mm.
   */
  readonly previewZoom = signal(0.68);

  /** Фиксированные отступы таблицы под макет PNG (редактирование в коде при смене макета). */
  /** Отступ контента от верха 1-го листа (под PNG). ~+13 мм к прежнему 52 мм — как высота строки заголовка КП. */
  readonly contentPaddingTop = '65mm';
  readonly contentPaddingTopPage2 = '44mm';

  readonly form = this.fb.group({
    /** Сколько строк на одном листе; следующие — на следующем листе (фон 2стр). */
    rowsPerPage: this.fb.nonNullable.control('12'),
    /**
     * Получатель КП: `org:<id>` (организация) или `contact:<id>` (контактное лицо), пусто — не выбрано.
     */
    recipient: this.fb.nonNullable.control(''),
    /** Поиск по названию (фильтр пунктов в общем списке). */
    organizationSearch: this.fb.nonNullable.control(''),
    /**
     * При выборе организации с контактами — один контакт для строки «Контакт:» в КП (id из справочника).
     */
    organizationContactId: this.fb.nonNullable.control(''),
    /** Ставка НДС, % (по умолчанию 22). */
    vatPercent: this.fb.nonNullable.control('22'),
    /** Сумма НДС в рублях (редактируемая; изначально считается от итога). */
    vatAmount: this.fb.nonNullable.control(''),
    lines: this.fb.array([
      this.lineGroup('Профиль алюминиевый ПА-01', '10', 'м', '1250.50', ''),
      this.lineGroup('Поликарбонат сотовый 8 мм', '24', 'м²', '890', ''),
      this.lineGroup('Крепёж комплект', '5', 'компл.', '450', ''),
    ]),
  });

  ngOnInit(): void {
    this.form.controls.vatPercent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateVatAmountFromTotal());
    this.lines()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateVatAmountFromTotal());
    this.recalculateVatAmountFromTotal();
    this.organizationsRepository
      .getItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        const active = items.filter((o) => o.isActive);
        this.organizations.set(active);
        const raw = this.form.controls.recipient.value?.trim() ?? '';
        if (raw && !raw.includes(':')) {
          if (active.some((o) => o.id === raw)) {
            this.form.controls.recipient.patchValue(`${KP_RECIPIENT_ORG_PREFIX}${raw}`, { emitEvent: false });
          }
        }
        this.syncOrganizationContactId();
      });
    this.clientsRepository
      .getItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => this.clients.set(items.filter((c) => c.isActive)));

    this.form.controls.recipient.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncOrganizationContactId());
  }

  /** Сброс/подстановка контакта организации при смене получателя. */
  private syncOrganizationContactId(): void {
    const recipient = this.form.controls.recipient.value?.trim() ?? '';
    const orgId = recipient.startsWith(KP_RECIPIENT_ORG_PREFIX)
      ? recipient.slice(KP_RECIPIENT_ORG_PREFIX.length).trim()
      : '';
    const contactCtrl = this.form.controls.organizationContactId;
    if (!orgId) {
      contactCtrl.setValue('', { emitEvent: false });
      return;
    }
    const org = this.organizations().find((o) => o.id === orgId);
    const linked = org?.contactIds ?? [];
    if (linked.length === 0) {
      contactCtrl.setValue('', { emitEvent: false });
      return;
    }
    const cur = contactCtrl.value?.trim() ?? '';
    if (linked.length === 1) {
      contactCtrl.setValue(linked[0], { emitEvent: false });
      return;
    }
    if (cur && linked.includes(cur)) {
      return;
    }
    contactCtrl.setValue('', { emitEvent: false });
  }

  print(): void {
    window.print();
  }

  ngAfterViewInit(): void {
    const host = this.previewHost?.nativeElement;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }

    const update = () => {
      const el = this.previewHost?.nativeElement;
      if (!el) {
        return;
      }
      const cs = getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const innerW = Math.max(0, el.clientWidth - pl - pr);
      const sheetW = this.mmToPx(210);
      const z = sheetW > 0 ? Math.max(0.12, Math.min(2.5, innerW / sheetW)) : 0.68;
      this.previewZoom.set(z);
    };

    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => update());
      });
      this.resizeObserver.observe(host);
    });
    queueMicrotask(() => this.ngZone.run(() => update()));
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private mmToPx(mm: number): number {
    if (typeof document === 'undefined') {
      return mm * 3.78;
    }
    const probe = document.createElement('div');
    probe.style.width = `${mm}mm`;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.left = '-9999px';
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    return w > 0 ? w : mm * 3.78;
  }

  lines(): FormArray {
    return this.form.controls.lines;
  }

  /** Новая строка с типовыми значениями для быстрого ввода. */
  addLine(): void {
    this.lines().push(this.lineGroup('', '1', 'шт.', '0', ''));
  }

  /** Добавить позицию из витрины в таблицу КП и в PDF. */
  addFromVitrine(p: KpCatalogProduct): void {
    const imageUrl = `https://picsum.photos/seed/${p.imageSeed}/200/200`;
    this.lines().push(this.lineGroup(p.title, '1', 'шт.', String(p.price), imageUrl));
  }

  private lineGroup(name: string, qty: string, unit: string, price: string, imageUrl: string) {
    return this.fb.group({
      name: this.fb.nonNullable.control(name),
      qty: this.fb.nonNullable.control(qty),
      unit: this.fb.nonNullable.control(unit),
      price: this.fb.nonNullable.control(price),
      imageUrl: this.fb.nonNullable.control(imageUrl),
    });
  }

  /**
   * Итого по таблице — сумма без НДС; НДС начисляется сверху: T × r / 100.
   * «Всего к оплате» в шаблоне = T + сумма НДС.
   */
  private recalculateVatAmountFromTotal(): void {
    const total = this.totalFromLines();
    const p = this.parsePercent(this.form.controls.vatPercent.value);
    const vat = total * (p / 100);
    this.form.controls.vatAmount.patchValue(vat.toFixed(2), { emitEvent: false });
  }

  private totalFromLines(): number {
    const rows = this.lines().getRawValue() as KpLineItem[];
    return rows.reduce((acc, line) => acc + this.lineSum(line), 0);
  }

  private lineSum(line: KpLineItem): number {
    const q = Number(String(line.qty).replace(/\s/g, '').replace(',', '.'));
    const pr = Number(String(line.price).replace(/\s/g, '').replace(',', '.'));
    const qty = Number.isFinite(q) ? q : 0;
    const price = Number.isFinite(pr) ? pr : 0;
    return qty * price;
  }

  private parsePercent(raw: string | undefined): number {
    const n = Number(String(raw ?? '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 22;
  }
}
